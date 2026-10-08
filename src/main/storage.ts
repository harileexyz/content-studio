import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { Brand, BrandInput, ContentPack, Job } from "../shared/models";
import { parseRequest } from "../shared/contracts";
const requireModule = createRequire(__filename);
export class Store {
  constructor(
    private db: Database,
    private SQL: SqlJsStatic,
    private path: string,
  ) {}
  private rows<T>(query: string, values: string[] = []): T[] {
    const stmt = this.db.prepare(query);
    try {
      stmt.bind(values);
      const result: T[] = [];
      while (stmt.step())
        result.push(JSON.parse(String(stmt.getAsObject().data)) as T);
      return result;
    } finally {
      stmt.free();
    }
  }
  private write(action: () => void) {
    const before = this.db.export();
    const temporary = this.path + ".tmp";
    try {
      this.db.run("BEGIN");
      action();
      this.db.run("COMMIT");
      const fd = openSync(temporary, "w", 0o600);
      try {
        writeFileSync(fd, this.db.export());
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(temporary, this.path);
    } catch (error) {
      this.db.close();
      this.db = new this.SQL.Database(before);
      if (existsSync(temporary)) unlinkSync(temporary);
      throw error;
    }
  }
  getBrand(): Brand | null {
    return this.rows<Brand>("SELECT data FROM brand WHERE id=1")[0] ?? null;
  }
  saveBrand(input: BrandInput) {
    const valid = parseRequest("saveBrand", input);
    const brand: Brand = { ...valid, id: "brand" };
    this.write(() =>
      this.db.run("INSERT OR REPLACE INTO brand(id,data) VALUES(1,?)", [
        JSON.stringify(brand),
      ]),
    );
    return brand;
  }
  getPacks(): ContentPack[] {
    return this.rows<ContentPack>(
      "SELECT data FROM packs ORDER BY created_at DESC, id DESC",
    );
  }
  getPack(id: string): ContentPack | null {
    return (
      this.rows<ContentPack>("SELECT data FROM packs WHERE id=?", [id])[0] ??
      null
    );
  }
  getByRequest(id: string): ContentPack | null {
    return (
      this.rows<ContentPack>("SELECT data FROM packs WHERE request_id=?", [
        id,
      ])[0] ?? null
    );
  }
  insertPack(pack: ContentPack, job: Job) {
    this.write(() => {
      this.db.run(
        "INSERT INTO packs(id,request_id,created_at,data) VALUES(?,?,?,?)",
        [pack.id, pack.requestId, pack.createdAt, JSON.stringify(pack)],
      );
      this.db.run("INSERT INTO jobs(id,pack_id,data) VALUES(?,?,?)", [
        job.id,
        pack.id,
        JSON.stringify(job),
      ]);
    });
  }
  updatePack(pack: ContentPack) {
    if (!this.getPack(pack.id))
      throw new Error("This content pack was not found.");
    this.write(() => {
      this.db.run("UPDATE packs SET data=? WHERE id=?", [
        JSON.stringify(pack),
        pack.id,
      ]);
      this.db.run("DELETE FROM approvals WHERE pack_id=?", [pack.id]);
      for (const target of pack.targets)
        if (target.approval)
          this.db.run(
            "INSERT INTO approvals(target_id,pack_id,data) VALUES(?,?,?)",
            [target.id, pack.id, JSON.stringify(target.approval)],
          );
    });
  }
  getJobs(): Job[] {
    return this.rows<Job>("SELECT data FROM jobs ORDER BY rowid DESC");
  }
  saveJob(job: Job) {
    this.write(() =>
      this.db.run(
        "INSERT OR REPLACE INTO jobs(id,pack_id,data) VALUES(?,?,?)",
        [job.id, job.packId, JSON.stringify(job)],
      ),
    );
  }
  close() {
    this.db.close();
  }
}
export async function openStore(
  dir: string,
  wasmPath?: string,
): Promise<Store> {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, "studio.sqlite");
  const SQL = await initSqlJs({
    locateFile: () =>
      wasmPath ?? requireModule.resolve("sql.js/dist/sql-wasm.wasm"),
  });
  const db = existsSync(path)
    ? new SQL.Database(readFileSync(path))
    : new SQL.Database();
  const version = Number(db.exec("PRAGMA user_version")[0].values[0][0]);
  if (version > 2) {
    db.close();
    throw new Error("This studio database needs a newer app version.");
  }
  db.run(`CREATE TABLE IF NOT EXISTS brand(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS packs(id TEXT PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,pack_id TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS approvals(target_id TEXT PRIMARY KEY,pack_id TEXT NOT NULL,data TEXT NOT NULL);
    PRAGMA user_version=2;`);
  return new Store(db, SQL, path);
}
