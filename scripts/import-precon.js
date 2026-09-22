#!/usr/bin/env node
// Import a NetrunnerDB decklist into a precons/ file.
//
// Usage:
//   node scripts/import-precon.js <decklist_uuid> <identity_card_id> [--deck-set "Some Set"] [--quick] [--gauntlet] [--default]
//
// Example:
//   node scripts/import-precon.js 1077e934-c9f7-4447-834b-2bebd38b916c 35069
//
// The identity card code must be supplied because the decklist API response
// does not include it. Flags map to the registerPrecon booleans (all default
// to false except useForCustomGame which is always true).

const fs = require("fs");
const path = require("path");
const https = require("https");

const args = process.argv.slice(2);
const positional = [];
const options = { deckSet: "", quick: false, gauntlet: false, default: false };
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--deck-set") { i++; options.deckSet = i < args.length ? args[i] : ""; }
    else if (args[i] === "--quick") options.quick = true;
    else if (args[i] === "--gauntlet") options.gauntlet = true;
    else if (args[i] === "--default") options.default = true;
    else positional.push(args[i]);
}

if (positional.length < 2) {
    console.error("Usage: node scripts/import-precon.js <decklist_uuid> <identity_card_id> [--deck-set \"Set\"] [--quick] [--gauntlet] [--default]");
    process.exit(1);
}

const [uuid, identity] = positional;
const preconsDir = path.join(__dirname, "..", "precons");

function httpGetJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`API request failed: HTTP ${res.statusCode}`));
                res.resume();
                return;
            }
            let raw = "";
            res.on("data", chunk => (raw += chunk));
            res.on("end", () => {
                try { resolve(JSON.parse(raw)); }
                catch (e) { reject(new Error("Failed to parse API response: " + e.message)); }
            });
        }).on("error", reject);
    });
}

async function main() {
    const body = await httpGetJson(`https://netrunnerdb.com/api/2.0/public/decklist/${uuid}`);
    if (!body.success || !body.data || !body.data.length) {
        throw new Error(`No decklist found for ${uuid}`);
    }
    const deck = body.data[0];

    if (!deck.cards || !Object.keys(deck.cards).length) throw new Error("Decklist has no cards");

    // Build the cards object, filtering out the identity card (the identity is
    // passed on the CLI and is listed separately in registerPrecon).
    const cards = {};
    for (const code of Object.keys(deck.cards)) {
        if (String(code) !== String(identity)) cards[code] = deck.cards[code];
    }
    if (!Object.keys(cards).length) throw new Error("Decklist has no cards after removing the identity");

    // Infer set codes from card code ranges, matching existing precon files:
    //   300xx -> sg, 310xx -> su21, 350xx -> elev, 1xxx/2xxx -> core
    const sets = new Set();
    for (const code of Object.keys(cards)) {
        const n = parseInt(code, 10);
        if (n >= 35000 && n < 36000) sets.add("elev");
        else if (n >= 31000 && n < 32000) sets.add("su21");
        else if (n >= 30000 && n < 31000) sets.add("sg");
        else if (n < 30000) sets.add("core");
    }

    // Strip HTML tags and entities from the description for notes.
    const notes = (deck.description || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    // Load the local card database so each card line can carry a
    // // Card Title comment, matching the other files in precons/.
    const cardDb = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "carddata", "carddata.json"), "utf8"));
    const cardTitles = {};
    for (const card of cardDb.data) cardTitles[card.code] = card.title;

    const lines = [];
    lines.push("// Exported preconstructed deck");
    lines.push("registerPrecon({");
    lines.push("    // name: Display name of the precon deck");
    lines.push(`    name: ${JSON.stringify(deck.name)},`);
    lines.push("    // identity: Card ID of the identity/commander for this deck");
    lines.push(`    identity: "${identity}",`);
    lines.push("    // useAsCustomDefault: Whether this deck is the default choice for its identity when auto-selecting");
    lines.push(`    useAsCustomDefault: ${options.default},`);
    lines.push("    // useForQuickGame: Whether to include this deck in Quick Game selection");
    lines.push("    useForQuickGame: " + options.quick + ",");
    lines.push("    // useForGauntlet: Whether to include this deck in Gauntlet mode selection");
    lines.push("    useForGauntlet: " + options.gauntlet + ",");
    lines.push("    // useForCustomGame: Whether to include this deck in Custom Game mode");
    lines.push("    useForCustomGame: true,");
    lines.push("    // deck_set: The set or category this deck belongs to");
    lines.push(`    deck_set: ${JSON.stringify(options.deckSet)},`);
    lines.push(`    URL: "https://netrunnerdb.com/en/decklist/${uuid}",`);
    lines.push(`    notes: ${JSON.stringify(notes)},`);
    lines.push("    cards: {");
    const codes = Object.keys(cards);
    codes.forEach((code, idx) => {
        const sep = idx === codes.length - 1 ? "" : ",";
        const title = cardTitles[code];
        const comment = title ? `  // ${title}` : "";
        lines.push(`        "${code}": ${cards[code]}${sep}${comment}`);
    });
    lines.push("    },");
    lines.push("    // sets: The set codes this deck is designed with");
    lines.push(`    sets: [${[...sets].map(s => `"${s}"`).join(", ")}]`);
    lines.push("});");

    const filename = deck.name.replace(/[\/\\:*?"<>|]/g, "").trim() + ".js";
    const outPath = path.join(preconsDir, filename);
    fs.writeFileSync(outPath, lines.join("\n") + "\n");
    console.log(`Wrote ${outPath}`);
    console.log(`Identity: ${identity}, cards: ${Object.keys(cards).length}, sets: ${[...sets].join(", ")}`);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
