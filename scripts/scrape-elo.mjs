// scripts/scrape-elo.mjs
import { writeFileSync, mkdirSync, renameSync, rmSync } from "node:fs";

const URL = "https://trash-or-busto.herokuapp.com/ranking";
const response = await fetch(URL);
if (!response.ok) throw new Error(`Ranking request failed: HTTP ${response.status}`);
const html = await response.text();

// Strip actual markup before decoding escaped text such as &lt;name&gt;.
const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
const decode = (s) => s.replace(/<[^>]+>/g, "")
  .replace(/&(amp|quot|apos|lt|gt|nbsp|#x[0-9a-f]+|#\d+);/gi, (entity, code) => {
    if (code[0] !== "#") return entities[code.toLowerCase()];
    const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  }).trim();

// <td>rank</td><td><a href=".../card/01081">Name</a></td><td>elo</td><td>votes</td>
const rowRe =
  /<a[^>]*href="[^"]*\/card\/(\d+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/g;

const byId = new Map();
for (const m of html.matchAll(rowRe)) {
  const [, id, rawName, elo, votes] = m;
  const row = { id, name: decode(rawName), elo: +elo, votes: +votes };
  if (!row.name || !Number.isSafeInteger(row.elo) || !Number.isSafeInteger(row.votes))
    throw new Error(`Invalid ranking for card ${id}`);
  const prev = byId.get(id);
  if (!prev || row.votes > prev.votes) byId.set(id, row); // dupes: keep more votes
}

if (!byId.size) throw new Error("No ranking rows found; existing ELO CSV was preserved");

const q = (s) => `"${s.replace(/"/g, '""')}"`;
const lines = [...byId.values()]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((r) => `${r.id},${q(r.name)},${r.elo},${r.votes}`);

mkdirSync("data", { recursive: true });
const temporary = `data/elo.csv.${process.pid}.tmp`;
try {
  writeFileSync(temporary, ["id,name,elo,votes", ...lines].join("\n") + "\n");
  renameSync(temporary, "data/elo.csv");
} finally {
  rmSync(temporary, { force: true });
}
console.log(`wrote ${lines.length} cards to data/elo.csv`);
