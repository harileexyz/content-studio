import { z } from "zod";
export function isPublicSource(value: string): boolean {
  try {
    const u = new URL(value);
    const h = u.hostname.replace(/\.$/, "").toLowerCase();
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      h.includes(".") &&
      !/^[\d.]+$/.test(h) &&
      !h.includes(":") &&
      !/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(h)
    );
  } catch {
    return false;
  }
}
export function sourceKey(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.href.replace(/\/$/, "");
}
const text = (max: number) => z.string().trim().min(1).max(max);
export const researchSchema = z.strictObject({
  title: text(100),
  script: text(2000),
  headline: text(80),
  points: z
    .array(
      z.strictObject({
        text: text(120),
        sourceIndices: z.array(z.number().int().nonnegative()).min(1).max(6),
      }),
    )
    .min(1)
    .max(3),
  sources: z
    .array(
      z.strictObject({
        title: text(120),
        url: z
          .string()
          .max(1000)
          .refine(isPublicSource, "A public HTTPS source is required"),
        claims: z.array(text(300)).min(1).max(8),
      }),
    )
    .min(1)
    .max(6),
  captions: z.strictObject({
    youtube_short: text(2200),
    instagram_reel: text(2200),
    instagram_feed_post: text(2200),
  }),
  limitations: z.array(text(300)).max(8),
  kind: z.enum(["evergreen", "news"]),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});
export type ResearchDraft = z.infer<typeof researchSchema>;
export function parseResearch(value: unknown): ResearchDraft {
  const draft = researchSchema.parse(value);
  if (
    draft.points.some((point) =>
      point.sourceIndices.some((index) => index >= draft.sources.length),
    )
  )
    throw new Error("A claim points to a missing source.");
  if (draft.kind === "news" && !draft.eventDate)
    throw new Error("News needs a dated event.");
  return draft;
}
export const outputSchema = z.toJSONSchema(researchSchema);
