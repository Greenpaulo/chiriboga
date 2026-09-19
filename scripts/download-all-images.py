import os
import json
import urllib.request
import time

# Options
JSON_FILE = "carddata.json"
OUTPUT_DIR = "assets/images/cards"
IMAGE_SIZE = "large"  # Options: 'large', 'medium', 'small'
DELAY_SECONDS = 0.1   # Delay between requests to avoid rate-limiting

def download_all_card_images():
    if not os.path.exists(JSON_FILE):
        print(f"Error: Could not find '{JSON_FILE}'. Make sure the script is in the same folder.")
        return

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        cards = json.load(f)

    # Handle wrapper structures if carddata.json has a root 'data' array
    if isinstance(cards, dict) and "data" in cards:
        cards = cards["data"]

    total_cards = len(cards)
    print(f"Loaded {total_cards} total card entries from {JSON_FILE}.\n")

    downloaded = 0
    skipped = 0
    failed = 0

    for idx, card in enumerate(cards, 1):
        code = card.get("code")
        pack_code = card.get("pack_code", "unknown")

        if not code:
            continue

        # Organize into set-specific subfolders (e.g., assets/images/cards/cac/03001.jpg)
        set_dir = os.path.join(OUTPUT_DIR, pack_code)
        os.makedirs(set_dir, exist_ok=True)

        file_path = os.path.join(set_dir, f"{code}.jpg")

        # Skip if already downloaded
        if os.path.exists(file_path):
            skipped += 1
            continue

        # Use image_url from JSON if present, otherwise construct default CDN URL
        image_url = card.get("image_url")
        if not image_url:
            image_url = f"https://card-images.netrunnerdb.com/v1/{IMAGE_SIZE}/{code}.jpg"

        try:
            req = urllib.request.Request(
                image_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Chiriboga Card Downloader)'}
            )
            with urllib.request.urlopen(req) as response, open(file_path, 'wb') as out_file:
                out_file.write(response.read())

            downloaded += 1
            print(f"[{idx}/{total_cards}] [{pack_code.upper()}] Downloaded {code}.jpg")
            
            time.sleep(DELAY_SECONDS)

        except Exception as e:
            failed += 1
            print(f"[{idx}/{total_cards}] [{pack_code.upper()}] Failed to download {code}.jpg: {e}")

    print("\n--- Download Finished ---")
    print(f"Downloaded: {downloaded}")
    print(f"Skipped (Already existed): {skipped}")
    print(f"Failed: {failed}")

if __name__ == "__main__":
    download_all_card_images()