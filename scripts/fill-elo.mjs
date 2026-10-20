// usage: node scripts/fill-elo.mjs [files...] [--dry] [--force]
// Default: every .js in sets/. Preserve existing ELO unless --force is set.
// Match ID first, then normalized name (highest-vote printing, ID breaks ties).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";

const args = process.argv.slice(2);
for (const arg of args) {
  if (arg.startsWith("--") && !["--dry", "--force"].includes(arg))
    throw new Error(`Unknown option: ${arg}`);
}
const DRY = args.includes("--dry");
const FORCE = args.includes("--force");
const files = args.filter((a) => !a.startsWith("--"));
if (!files.length) {
  for (const f of readdirSync("sets")) if (f.endsWith(".js")) files.push(`sets/${f}`);
}

const normalizeName = (name) => name.normalize("NFC")
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .trim().replace(/\s+/g, " ").toLowerCase();
const preferred = (row, previous) => !previous || row.votes > previous.votes ||
  (row.votes === previous.votes && row.id < previous.id);
const byId = new Map(), byName = new Map();
const rows = readFileSync("data/elo.csv", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
if (rows.shift() !== "id,name,elo,votes") throw new Error("Unexpected ELO CSV header");
for (const [index, line] of rows.entries()) {
  if (!line.trim()) continue;
  const match = /^(\d+),"((?:[^"]|"")*)",(\d+),(\d+)$/.exec(line);
  if (!match) throw new Error(`Invalid ELO CSV row ${index + 2}`);
  const row = { id: match[1].padStart(5, "0"), name: match[2].replace(/""/g, '"'),
    elo: Number(match[3]), votes: Number(match[4]) };
  if (!Number.isSafeInteger(row.elo) || !Number.isSafeInteger(row.votes))
    throw new Error(`Invalid ELO CSV numbers on row ${index + 2}`);
  if (preferred(row, byId.get(row.id))) byId.set(row.id, row);
  const name = normalizeName(row.name);
  if (preferred(row, byName.get(name))) byName.set(name, row);
}
if (!byId.size) throw new Error("ELO CSV contains no ranking rows");

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const headers = [...text.matchAll(/^(?:cardSet|coreSet)\[(\d+)\][ \t]*=[ \t]*\{/gm)];
  let out = text;
  let added = 0, replaced = 0, kept = 0, nameMatched = 0;
  const missing = [];

  // Work backwards so earlier offsets stay valid. Only parse a quoted string
  // literal for the title; never evaluate a card definition or any CSV content.
  for (let i = headers.length - 1; i >= 0; i--) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
    const id = headers[i][1].padStart(5, "0");
    let block = text.slice(start, end);
    const titleLine = /^([ \t]+)title:[ \t]*("(?:\\[^\r\n]|[^"\\\r\n])*"|'(?:\\[^\r\n]|[^'\\\r\n])*')[^\r\n]*(?:\r?\n|$)/m.exec(block);
    const title = titleLine ? runInNewContext(titleLine[2], Object.create(null), { timeout: 100 }) : id;
    const existing = /^([ \t]+elo:[ \t]*)([^,\r\n/]+)/m.exec(block);
    // Existing values are preserved regardless of whether their printing is listed.
    if (existing && !FORCE) { kept++; continue; }
    const direct = byId.get(id);
    const ranking = direct || byName.get(normalizeName(title));
    if (!ranking) {
      if (existing) kept++;
      missing.push(`${title} (${id})`);
      continue;
    }
    if (!direct) nameMatched++;
    if (existing) {
      if (ranking.elo !== Number(existing[2].trim())) {
        const trailingSpace = /[ \t]*$/.exec(existing[2])[0];
        block = block.slice(0, existing.index) + existing[1] + ranking.elo + trailingSpace +
          block.slice(existing.index + existing[0].length);
        replaced++;
      } else kept++;
    } else {
      if (!titleLine) throw new Error(`No supported title line for ${id} in ${file}`);
      const position = titleLine.index + titleLine[0].length;
      const separator = titleLine[0].endsWith("\n") ? "" : eol;
      block = block.slice(0, position) + separator + `${titleLine[1]}elo: ${ranking.elo},${eol}` + block.slice(position);
      added++;
    }
    out = out.slice(0, start) + block + out.slice(end);
  }
  if (!DRY && out !== text) writeFileSync(file, out);
  console.log(`${file}: +${added} added, ${replaced} replaced, ${kept} kept, ${missing.length} not in CSV, ${nameMatched} matched by name${DRY ? " [dry run]" : ""}`);
  if (missing.length) console.log("  not found:", missing.join(", "));
}
