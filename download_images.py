#!/usr/bin/env python3
"""
Downloads card images for the Chiriboga Netrunner engine.

Reads carddata/carddata.json (already in your cloned repo) and pulls
each card's image from NetrunnerDB's official image CDN, saving it
locally as images/{code}.jpg -- exactly the filename Chiriboga expects.

Usage:
    Run this from inside your cloned chiriboga repo folder
    (the one containing carddata/carddata.json), e.g.:

        cd chiriboga
        python3 download_images.py

No third-party packages required -- uses only Python's standard library.
"""

import json
import os
import time
import urllib.request
import urllib.error

CARDDATA_PATH = os.path.join("carddata", "carddata.json")
IMAGES_DIR = "images"
IMAGE_URL_TEMPLATE = "https://card-images.netrunnerdb.com/v2/large/{code}.jpg"
REQUEST_DELAY_SECONDS = 0.3  # be polite to NetrunnerDB's CDN
USER_AGENT = "Mozilla/5.0 (Chiriboga local image sync script)"


def load_card_codes():
    if not os.path.exists(CARDDATA_PATH):
        raise SystemExit(
            f"Could not find {CARDDATA_PATH}. "
            "Run this script from inside your cloned chiriboga folder."
        )
    with open(CARDDATA_PATH, "r", encoding="utf-8") as f:
        payload = json.load(f)

    cards = payload.get("data", [])
    codes = []
    for card in cards:
        code = card.get("code")
        if code:
            codes.append(str(code))
    # de-duplicate while preserving order
    seen = set()
    unique_codes = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            unique_codes.append(c)
    return unique_codes


def download_image(code):
    dest_path = os.path.join(IMAGES_DIR, f"{code}.jpg")
    if os.path.exists(dest_path):
        return "skipped"

    url = IMAGE_URL_TEMPLATE.format(code=code)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            data = response.read()
        with open(dest_path, "wb") as out_file:
            out_file.write(data)
        return "downloaded"
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return "not_found"
        return f"error: HTTP {e.code}"
    except Exception as e:
        return f"error: {e}"


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    codes = load_card_codes()
    total = len(codes)
    print(f"Found {total} card codes in {CARDDATA_PATH}")
    print(f"Saving images into ./{IMAGES_DIR}/\n")

    downloaded = skipped = not_found = errors = 0

    for i, code in enumerate(codes, start=1):
        result = download_image(code)

        if result == "downloaded":
            downloaded += 1
        elif result == "skipped":
            skipped += 1
        elif result == "not_found":
            not_found += 1
        else:
            errors += 1
            print(f"  [{i}/{total}] {code}: {result}")

        if i % 100 == 0 or i == total:
            print(
                f"Progress: {i}/{total} "
                f"(downloaded={downloaded}, skipped={skipped}, "
                f"not_found={not_found}, errors={errors})"
            )

        if result == "downloaded":
            time.sleep(REQUEST_DELAY_SECONDS)

    print("\nDone.")
    print(f"  Downloaded: {downloaded}")
    print(f"  Already had: {skipped}")
    print(f"  Not found on NetrunnerDB (probably tokens/non-card entries): {not_found}")
    print(f"  Errors: {errors}")
    if errors:
        print("\nIf you saw errors above, you can just re-run this script -- ")
        print("it skips anything already downloaded, so it's safe to retry.")


if __name__ == "__main__":
    main()
