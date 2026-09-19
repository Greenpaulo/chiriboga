#!/usr/bin/env python3
"""Append one NetrunnerDB card set to carddata/carddata.json.

The repository stores the legacy NetrunnerDB v2 card shape. NetrunnerDB's
current v3 API uses JSON:API resources and canonical set IDs, so this script
resolves a legacy pack code (for example ``vp``), fetches only that set's
printings, converts them to the local shape, and appends only missing codes.

Usage:
    python3 sync_card_set.py <pack_code>
    python3 sync_card_set.py <pack_code> --check
"""

import argparse
import json
import os
import tempfile
import urllib.error
import urllib.request


CARDDATA_PATH = os.path.join("carddata", "carddata.json")
API_ROOT = "https://api.netrunnerdb.com/api/v3/public"
USER_AGENT = "Chiriboga card metadata sync"


def fetch_json(url):
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.api+json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"NetrunnerDB returned HTTP {error.code} for {url}") from error
    except urllib.error.URLError as error:
        raise SystemExit(f"Could not reach NetrunnerDB: {error.reason}") from error


def resolve_card_set(pack_code):
    payload = fetch_json(f"{API_ROOT}/card_sets")
    matches = []
    for resource in payload.get("data", []):
        attributes = resource.get("attributes", {})
        if resource.get("id") == pack_code or attributes.get("legacy_code") == pack_code:
            matches.append(resource)

    if len(matches) != 1:
        available = sorted(
            resource.get("attributes", {}).get("legacy_code")
            for resource in payload.get("data", [])
            if resource.get("attributes", {}).get("legacy_code")
        )
        raise SystemExit(
            f"Could not uniquely resolve pack code {pack_code!r}. "
            f"Known legacy codes include: {', '.join(available)}"
        )
    return matches[0]


def legacy_number(value):
    """Convert v3's numeric strings to v2-style numbers; variable values are null."""
    if value is None or isinstance(value, (int, float)):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def legacy_card(resource, pack_code):
    attributes = resource["attributes"]
    card_type = attributes.get("card_type_id")
    if card_type in ("corp_identity", "runner_identity"):
        card_type = "identity"

    text = attributes.get("text")
    stripped_text = attributes.get("stripped_text")
    flavor = attributes.get("flavor")
    faces = sorted(attributes.get("faces", []), key=lambda face: face.get("index", 0))
    if faces:
        text_parts = [text] if text else []
        stripped_text_parts = [stripped_text] if stripped_text else []
        flavor_parts = [flavor] if flavor else []
        for index, face in enumerate(faces, start=1):
            if face.get("text"):
                text_parts.append(f"Side {index}: {face['text']}")
            if face.get("stripped_text"):
                stripped_text_parts.append(f"Side {index}: {face['stripped_text']}")
            if face.get("flavor"):
                flavor_parts.append(face["flavor"])
        text = "\n".join(text_parts)
        stripped_text = " ".join(stripped_text_parts)
        flavor = "\n".join(flavor_parts) or None

    card = {
        "code": resource["id"],
        "deck_limit": attributes.get("deck_limit"),
        "faction_code": attributes.get("faction_id", "").replace("_", "-"),
        "faction_cost": attributes.get("influence_cost") or 0,
        "pack_code": pack_code,
        "position": attributes.get("position_in_set", attributes.get("position")),
        "quantity": attributes.get("quantity"),
        "side_code": attributes.get("side_id"),
        "stripped_text": stripped_text,
        "stripped_title": attributes.get("stripped_title"),
        "text": text,
        "title": attributes.get("title"),
        "type_code": card_type,
        "uniqueness": attributes.get("is_unique", False),
    }

    optional = {
        "advancement_cost": legacy_number(attributes.get("advancement_requirement")),
        "agenda_points": attributes.get("agenda_points"),
        "base_link": attributes.get("base_link"),
        "cost": legacy_number(attributes.get("cost")),
        "flavor": flavor,
        "illustrator": attributes.get("display_illustrators"),
        "influence_limit": attributes.get("influence_limit"),
        "keywords": attributes.get("display_subtypes")
        or " - ".join(attributes.get("card_subtype_names", []))
        or None,
        "memory_cost": attributes.get("memory_cost"),
        "minimum_deck_size": attributes.get("minimum_deck_size"),
        "strength": attributes.get("strength"),
        "trash_cost": attributes.get("trash_cost"),
    }
    for key, value in optional.items():
        if value is not None or key == "cost" and attributes.get("cost") is not None:
            card[key] = value

    return dict(sorted(card.items()))


def fetch_set_cards(card_set):
    attributes = card_set["attributes"]
    pack_code = attributes["legacy_code"]
    url = card_set["relationships"]["printings"]["links"]["related"]
    payload = fetch_json(url)
    resources = payload.get("data", [])
    expected = attributes.get("size")
    reported = payload.get("meta", {}).get("stats", {}).get("total", {}).get("count")

    if expected is not None and len(resources) != expected:
        raise SystemExit(
            f"Expected {expected} cards for {pack_code}, but the API returned {len(resources)}."
        )
    if reported is not None and len(resources) != reported:
        raise SystemExit(
            f"The API reports {reported} cards for {pack_code}, but returned {len(resources)}."
        )

    cards = [legacy_card(resource, pack_code) for resource in resources]
    cards.sort(key=lambda card: (card.get("position", 0), card["code"]))
    return cards


def load_local_carddata():
    try:
        with open(CARDDATA_PATH, "r", encoding="utf-8") as source:
            payload = json.load(source)
    except FileNotFoundError as error:
        raise SystemExit(
            f"Could not find {CARDDATA_PATH}; run this script from the repository root."
        ) from error
    if not isinstance(payload.get("data"), list):
        raise SystemExit(f"{CARDDATA_PATH} does not contain a data array.")
    return payload


def write_atomically(payload):
    directory = os.path.dirname(CARDDATA_PATH)
    descriptor, temporary_path = tempfile.mkstemp(
        prefix="carddata-", suffix=".json", dir=directory
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(payload, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.replace(temporary_path, CARDDATA_PATH)
    except Exception:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pack_code", help="legacy NetrunnerDB pack code, for example vp")
    parser.add_argument(
        "--check",
        action="store_true",
        help="report missing cards without changing carddata.json",
    )
    args = parser.parse_args()

    card_set = resolve_card_set(args.pack_code)
    remote_cards = fetch_set_cards(card_set)
    payload = load_local_carddata()
    existing_by_code = {str(card.get("code")): card for card in payload["data"]}

    conflicts = []
    missing = []
    for card in remote_cards:
        existing = existing_by_code.get(card["code"])
        if existing is None:
            missing.append(card)
        elif existing.get("pack_code") != args.pack_code:
            conflicts.append(
                f"{card['code']} is already assigned to {existing.get('pack_code')!r}"
            )
    if conflicts:
        raise SystemExit("Refusing to merge conflicting card codes:\n  " + "\n  ".join(conflicts))

    set_name = card_set["attributes"]["name"]
    if not missing:
        print(f"{set_name} ({args.pack_code}) is already complete: {len(remote_cards)} cards.")
        return
    if args.check:
        print(f"{set_name} ({args.pack_code}) is missing {len(missing)} cards:")
        for card in missing:
            print(f"  {card['code']} {card['title']}")
        raise SystemExit(1)

    payload["data"].extend(missing)
    payload["total"] = len(payload["data"])
    write_atomically(payload)
    print(
        f"Appended {len(missing)} {set_name} cards to {CARDDATA_PATH}; "
        f"the file now contains {payload['total']} cards."
    )


if __name__ == "__main__":
    main()
