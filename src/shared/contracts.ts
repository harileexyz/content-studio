import { z } from "zod";
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const target = {
  packId: id,
  targetId: id,
  expectedRevision: z.number().int().positive(),
};
export const schemas = {
  getState: z.undefined(),
  detectProvider: z.undefined(),
  connectProvider: z.undefined(),
  copyCodexCommand: z.strictObject({ command: z.enum(["install", "signin"]) }),
  openCodexInstallGuide: z.undefined(),
  openTerminal: z.undefined(),
  createResearchPack: z.strictObject({
    topic: z.string().trim().min(1).max(120),
    requestId: id,
  }),
  cancelResearch: z.strictObject({ jobId: id }),
  openSource: z.strictObject({
    packId: id,
    sourceIndex: z.number().int().nonnegative().max(5),
  }),
  openResearchSource: z.strictObject({ jobId: id, activityId: id }),
  saveBrand: z.strictObject({
    name: z.string().trim().min(1).max(50),
    colors: z.tuple([
      z.string().regex(/^#[0-9a-fA-F]{6}$/),
      z.string().regex(/^#[0-9a-fA-F]{6}$/),
      z.string().regex(/^#[0-9a-fA-F]{6}$/),
    ]),
    voice: z.string().trim().min(1).max(200),
  }),
  createSamplePack: z.strictObject({
    topic: z.string().trim().min(1).max(120),
    requestId: id,
  }),
  reviseTarget: z.strictObject({
    ...target,
    caption: z.string().trim().min(1).max(2200),
  }),
  approveTarget: z.strictObject(target),
};
export type Method = keyof typeof schemas;
export function parseRequest<M extends Method>(
  method: M,
  value: unknown,
): z.infer<(typeof schemas)[M]> {
  return schemas[method].parse(value) as z.infer<(typeof schemas)[M]>;
}
export function isTrustedFrame(
  actual: string,
  expected: string,
  main: boolean,
): boolean {
  return main && actual === expected;
}
