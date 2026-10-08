import type { Brand } from "../shared/models";
import type { ResearchDraft } from "../shared/research";
function escape(text: string) {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
}
function wrap(text: string, width = 22): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    for (const piece of word.match(new RegExp(`.{1,${width}}`, "gu")) ?? []) {
      if ((line + " " + piece).trim().length > width) {
        if (line) lines.push(line);
        line = piece;
      } else line = (line + " " + piece).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}
export function makeGraphic(topic: string, brand: Brand): string {
  const lines = wrap(topic);
  const size = Math.min(78, 450 / Math.max(1, lines.length - 1) / 1.12);
  const step = size * 1.12;
  const brandSize = Math.min(32, 720 / Math.max(1, brand.name.length) / 0.65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="1350" fill="${brand.colors[0]}"/>
  <rect x="60" y="60" width="76" height="88" rx="20" fill="${brand.colors[1]}"/><text x="80" y="124" font-family="Arial,sans-serif" font-weight="700" font-size="70" fill="#141820">;</text>
  <text x="163" y="117" font-family="Arial,sans-serif" font-size="${brandSize}" font-weight="700" fill="#ffffff">${escape(brand.name)}</text>
  <text x="60" y="239" font-family="Arial,sans-serif" font-size="27" fill="#ffffff">An idea worth explaining</text>
  ${lines.map((line, i) => `<text x="60" y="${350 + i * step}" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" fill="#ffffff">${escape(line)}</text>`).join("")}
  <rect x="60" y="900" width="960" height="260" rx="30" fill="${brand.colors[2]}"/>
  <path d="M 230 1030 H 850" stroke="#141820" stroke-width="5"/>
  ${["One topic", "One example", "One takeaway"].map((label, i) => `<circle cx="${220 + i * 320}" cy="1005" r="45" fill="#141820"/><text x="${220 + i * 320}" y="1020" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#ffffff">${i + 1}</text><text x="${220 + i * 320}" y="1110" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#141820">${label}</text>`).join("")}
  <rect x="60" y="1224" width="238" height="62" rx="31" fill="#141820"/><text x="179" y="1264" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" fill="#ffffff">Sample graphic</text>
  <text x="1020" y="1264" text-anchor="end" font-family="Arial,sans-serif" font-size="25" fill="#ffffff">Your story. Your studio.</text>
  </svg>`;
}

export function makeResearchGraphic(
  draft: ResearchDraft,
  brand: Brand,
): string {
  const template = makeGraphic(draft.headline, brand);
  const points = draft.points
    .map((point, i) => {
      const y = 890 + i * 105;
      return (
        `<circle cx="112" cy="${y + 5}" r="23" fill="#141820"/><text x="112" y="${y + 13}" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#ffffff">${i + 1}</text>` +
        wrap(point.text, 54)
          .map(
            (line, index) =>
              `<text x="157" y="${y + index * 29}" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#141820">${escape(line)}</text>`,
          )
          .join("")
      );
    })
    .join("");
  return template
    .replace(
      'y="900" width="960" height="260"',
      'y="840" width="960" height="350"',
    )
    .replace(/<path d="M 230[\s\S]*?(?=<rect x="60" y="1224")/, points)
    .replace("Sample graphic", "Research draft")
    .replace("An idea worth explaining", "A practical idea, explained");
}
