#!/usr/bin/env python3
"""
Scaffolder for Chiriboga Netrunner card sets.

Reads carddata/carddata.json and updates/creates sets/<setname>.js with
properly formatted boilerplate card definitions, preserving any cards
that have already been implemented.

Usage:
    python3 scaffold_set.py [pack_code]

Examples:
    python3 scaffold_set.py df       # Scaffolds Downfall (sets/downfall.js)
    python3 scaffold_set.py ms       # Scaffolds Midnight Sun (sets/midnightsun.js)
    python3 scaffold_set.py ph       # Scaffolds Parhelion (sets/parhelion.js)
    python3 scaffold_set.py tai      # Scaffolds The Automata Initiative (sets/automatainitiative.js)
    python3 scaffold_set.py rwr      # Scaffolds Rebellion Without Rehearsal (sets/rebellion.js)
    python3 scaffold_set.py elev     # Scaffolds Elevation (sets/elevation.js)
"""

import json
import os
import re
import sys

# Mapping pack_code -> (set_filename_without_ext, set_code_for_setIdentifiers)
PACK_MAP = {
    # Core & Re-releases
    "core": ("coreset", "core"),
    "core2": ("revisedcoreset", "core2"),
    "sc19": ("systemcore2019", "sc19"),
    "sg": ("systemgateway", "sg"),
    "su21": ("systemupdate2021", "su21"),

    # Genesis Cycle
    "wla": ("whatliesahead", "wla"),
    "ta": ("traceamount", "ta"),
    "ce": ("cyberexodus", "ce"),
    "asis": ("astudyinstatic", "asis"),
    "hs": ("humanitysshadow", "hs"),
    "fp": ("futureproof", "fp"),

    # Creation and Control
    "cac": ("creationandcontrol", "cac"),

    # Spin Cycle
    "om": ("openingmoves", "om"),
    "st": ("secondthoughts", "st"),
    "mt": ("malatempora", "mt"),
    "tc": ("truecolors", "tc"),
    "fal": ("fearandloathing", "fal"),
    "dt": ("doubletime", "dt"),

    # Honor and Profit
    "hap": ("honorandprofit", "hap"),

    # Lunar Cycle
    "up": ("upstalk", "up"),
    "tsb": ("thespacesbetween", "tsb"),
    "fc": ("firstcontact", "fc"),
    "uao": ("upandover", "uao"),
    "atr": ("allthatremains", "atr"),
    "ts": ("thesource", "ts"),

    # Order and Chaos
    "oac": ("orderandchaos", "oac"),

    # SanSan Cycle
    "val": ("thevalley", "val"),
    "bb": ("breakerbay", "bb"),
    "cc": ("chromecity", "cc"),
    "uw": ("theunderway", "uw"),
    "oh": ("oldhollywood", "oh"),
    "uot": ("theuniverseoftomorrow", "uot"),

    # Data and Destiny
    "dad": ("dataanddestiny", "dad"),

    # Mumbad Cycle
    "kg": ("kalaghoda", "kg"),
    "bf": ("businessfirst", "bf"),
    "dag": ("democracyanddogma", "dag"),
    "si": ("salsetteisland", "si"),
    "tlm": ("theliberatedmind", "tlm"),
    "ftm": ("fearthemasses", "ftm"),

    # Flashpoint Cycle
    "23s": ("23seconds", "23s"),
    "bm": ("bloodmoney", "bm"),
    "es": ("escalation", "es"),
    "in": ("intervention", "in"),
    "ml": ("martiallaw", "ml"),
    "qu": ("quorum", "qu"),

    # Red Sand Cycle
    "dc": ("daedaluscomplex", "dc"),
    "so": ("stationone", "so"),
    "eas": ("earthsscion", "eas"),
    "baw": ("bloodandwater", "baw"),
    "fm": ("freemars", "fm"),
    "cd": ("crimsondust", "cd"),

    # Terminal Directive
    "td": ("terminaldirectivecards", "td"),
    "tdc": ("terminaldirectivecampaign", "tdc"),

    # Kitara Cycle
    "ss": ("sovereignsight", "ss"),
    "dtwn": ("downthewhitenile", "dtwn"),
    "cotc": ("councilofthecrest", "cotc"),
    "tdatd": ("thedevilandthedragon", "tdatd"),
    "win": ("whispersinnalubaale", "win"),
    "ka": ("kampalaascendent", "ka"),

    # Reign and Reverie
    "rar": ("reignandreverie", "rar"),

    # Promos & Misc
    "draft": ("draft", "draft"),
    "mo": ("magnumopus", "mo"),
    "napd": ("napdmultiplayer", "napd"),
    "mor": ("magnumopusreprint", "mor"),
    "sm": ("salvagedmemories", "sm"),

    # Ashes Cycle
    "df": ("downfall", "df"),
    "urbp": ("uprisingboosterpack", "urbp"),
    "ur": ("uprising", "ur"),

    # Borealis Cycle
    "msbp": ("midnightsunboosterpack", "msbp"),
    "ms": ("midnightsun", "ms"),
    "ph": ("parhelion", "ph"),

    # Liberation Cycle
    "tai": ("automatainitiative", "tai"),
    "rwr": ("rebellion", "rwr"),

    # Elevation & Vantage Point
    "elev": ("elevation", "elev"),
    "vp": ("vantagepoint", "vp"),
}

FACTION_MAP = {
    "anarch": "Anarch",
    "criminal": "Criminal",
    "shaper": "Shaper",
    "haas-bioroid": "Haas-Bioroid",
    "jinteki": "Jinteki",
    "nbn": "NBN",
    "weyland-consortium": "Weyland Consortium",
    "neutral-runner": "Neutral",
    "neutral-corp": "Neutral",
}


def load_carddata():
    path = os.path.join("carddata", "carddata.json")
    if not os.path.exists(path):
        print(f"Error: Could not find {path}. Run this from your chiriboga folder.")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("data", [])


def find_existing_card_ids(set_file_path):
    """Finds card IDs already defined in the JS file as cardSet[XXXXX] = {."""
    if not os.path.exists(set_file_path):
        return set()
    with open(set_file_path, "r", encoding="utf-8") as f:
        content = f.read()
    matches = re.findall(r"cardSet\[(\d+)\]\s*=", content)
    return set(int(m) for m in matches)


def clean_text(text):
    if not text:
        return ""
    # Strip basic html tags like <strong>, </strong>, etc.
    text = re.sub(r"<[^>]+>", "", text)
    # Replace common symbols
    text = text.replace("[credit]", "[c]")
    text = text.replace("[click]", "[click]")
    text = text.replace("[recurring-credit]", "[recurring-c]")
    text = text.replace("[trash]", "[trash]")
    text = text.replace("[subroutine]", "↳")
    return text.strip()


def generate_card_stub(card):
    code = int(card["code"])
    title = card.get("title", "").replace('"', '\\"')
    side = card.get("side_code", "runner")
    player_str = "corp" if side == "corp" else "runner"
    faction_code = card.get("faction_code", "")
    faction = FACTION_MAP.get(faction_code, faction_code.title())
    influence = card.get("faction_cost", 0)
    type_code = card.get("type_code", "")
    keywords = card.get("keywords", "")
    subtypes = [s.strip() for s in keywords.split("-")] if keywords else []
    subtypes_str = json.dumps(subtypes)

    raw_text = clean_text(card.get("text", ""))
    commented_text = "\n".join(f"// {line}" for line in raw_text.splitlines()) if raw_text else "// (No rules text)"

    lines = []
    lines.append(f"//{title} ({code})")
    lines.append(commented_text)
    lines.append(f"cardSet[{code}] = {{")
    lines.append(f'  title: "{title}",')
    lines.append(f'  imageFile: "{code}.png",')
    lines.append(
        "  // TODO: Add the exact ELO from "
        "https://trash-or-busto.herokuapp.com/ranking"
    )
    lines.append(f"  player: {player_str},")
    lines.append(f'  faction: "{faction}",')
    if type_code != "identity":
        lines.append(f"  influence: {influence},")
    lines.append(f'  cardType: "{type_code}",')
    if subtypes:
        lines.append(f"  subTypes: {subtypes_str},")
    else:
        lines.append("  subTypes: [],")

    # Type-specific attributes
    if type_code == "identity":
        deck_size = card.get("minimum_deck_size", 45)
        inf_limit = card.get("influence_limit", 15)
        lines.append(f"  deckSize: {deck_size},")
        lines.append(f"  influenceLimit: {inf_limit},")
        if side == "runner":
            lines.append(f"  link: {card.get('base_link', 0)},")

    elif type_code in ("event", "operation"):
        lines.append(f"  playCost: {card.get('cost', 0)},")
        lines.append("  Resolve: function (params) {")
        lines.append("    // TODO: Implement effect")
        lines.append("  },")

    elif type_code in ("hardware", "resource"):
        lines.append(f"  installCost: {card.get('cost', 0)},")
        lines.append("  // TODO: Add abilities or responseOn triggers")

    elif type_code == "program":
        lines.append(f"  installCost: {card.get('cost', 0)},")
        lines.append(f"  memoryCost: {card.get('memory_cost', 1)},")
        if "Icebreaker" in subtypes:
            lines.append(f"  strength: {card.get('strength', 0)},")
            lines.append("  strengthBoost: 0,")
            lines.append("  modifyStrength: {")
            lines.append("    Resolve: function (card) {")
            lines.append("      if (card == this) return this.strengthBoost;")
            lines.append("      return 0;")
            lines.append("    },")
            lines.append("  },")
            lines.append("  abilities: [")
            lines.append("    // TODO: Add break and strength pump abilities")
            lines.append("  ],")
        else:
            lines.append("  // TODO: Add abilities or responseOn triggers")

    elif type_code == "agenda":
        lines.append(f"  advancementRequirement: {card.get('advancement_cost', 3)},")
        lines.append(f"  agendaPoints: {card.get('agenda_points', 1)},")
        lines.append("  // onScore: { Resolve: function () { ... } },")

    elif type_code in ("asset", "upgrade"):
        lines.append(f"  rezCost: {card.get('cost', 0)},")
        lines.append(f"  trashCost: {card.get('trash_cost', 0)},")
        lines.append("  // TODO: Add abilities or responseOn triggers")

    elif type_code == "ice":
        lines.append(f"  rezCost: {card.get('cost', 0)},")
        lines.append(f"  strength: {card.get('strength', 0)},")
        lines.append("  subroutines: [")
        lines.append("    // { text: \"...\", Resolve: function () { ... } },")
        lines.append("  ],")
        lines.append("  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {")
        lines.append("    // result.sr = [[[\"...\"]]];")
        lines.append("    return result;")
        lines.append("  },")

    lines.append("};")
    return "\n".join(lines)


def main():
    target_pack = sys.argv[1].lower() if len(sys.argv) > 1 else "df"
    if target_pack not in PACK_MAP:
        print(f"Unknown pack code '{target_pack}'. Available options: {list(PACK_MAP.keys())}")
        sys.exit(1)

    filename, set_code = PACK_MAP[target_pack]
    sets_dir = "sets"
    set_file_path = os.path.join(sets_dir, f"{filename}.js")

    all_cards = load_carddata()
    pack_cards = [c for c in all_cards if c.get("pack_code") == target_pack]
    if not pack_cards:
        print(f"No cards found for pack_code '{target_pack}' in carddata.json.")
        sys.exit(1)

    pack_cards.sort(key=lambda c: int(c["code"]))
    existing_ids = find_existing_card_ids(set_file_path)

    missing_cards = [c for c in pack_cards if int(c["code"]) not in existing_ids]

    print(f"Pack: {target_pack.upper()} ({filename}.js)")
    print(f"Total cards in pack: {len(pack_cards)}")
    print(f"Already implemented: {len(existing_ids)}")
    print(f"Missing cards to scaffold: {len(missing_cards)}")

    if not missing_cards:
        print("All cards are already defined in the file! Nothing to scaffold.")
        return

    # Prepare file content
    if not os.path.exists(set_file_path):
        os.makedirs(sets_dir, exist_ok=True)
        file_header = f"// CARD DEFINITIONS FOR {filename.upper()}\nsetIdentifiers.push('{set_code}');\n\n"
        existing_content = file_header
    else:
        with open(set_file_path, "r", encoding="utf-8") as f:
            existing_content = f.read()
        if f"setIdentifiers.push('{set_code}')" not in existing_content:
            existing_content = f"setIdentifiers.push('{set_code}');\n\n" + existing_content

    new_stubs = []
    for card in missing_cards:
        new_stubs.append(generate_card_stub(card))

    separator = "\n\n"
    if not existing_content.endswith("\n\n"):
        if existing_content.endswith("\n"):
            separator = "\n"
        else:
            separator = "\n\n"

    updated_content = existing_content + separator + "\n\n".join(new_stubs) + "\n"

    with open(set_file_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

    print(f"\nSuccessfully added {len(missing_cards)} card stubs to {set_file_path}!")


if __name__ == "__main__":
    main()
