import os
import requests
import time
from bs4 import BeautifulSoup

# Configuration
BASE_URL = "https://blackletterkingjamesbible.com/Bible/{book}/{chapter}"
OUTPUT_DIR = "blackletter-kjv-scraped"
MAX_BOOKS = 100 # The script will automatically stop when it runs out of books

# Headers to mimic a standard web browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

def get_page_info(response, url, chapter):
    """Parse a response and return (soup, end_reason, book_name, displayed_chapter).
    end_reason is 'end_of_bible', 'end_of_book', or None (valid).
    """
    if response.url != url:
        return None, ("end_of_bible" if chapter == 1 else "end_of_book"), None, None

    soup = BeautifulSoup(response.text, 'html.parser')
    visible_text = soup.get_text(strip=True)

    if len(visible_text) < 500:
        return soup, ("end_of_bible" if chapter == 1 else "end_of_book"), None, None

    # Extract displayed chapter number from navref span
    displayed_chapter = None
    navref = soup.find("span", class_="navref Cinzel")
    if navref:
        try:
            displayed_chapter = int(navref.get_text(strip=True).split(":")[-1].strip())
        except ValueError:
            pass

    if displayed_chapter is not None and displayed_chapter != chapter:
        return soup, ("end_of_bible" if chapter == 1 else "end_of_book"), None, displayed_chapter

    # Extract book name from <title> tag (e.g. "King James Bible 1611 Genesis Chapter 1")
    book_name = None
    title_tag = soup.find("title")
    if title_tag:
        # Title format: "King James Bible 1611 {BookName} Chapter {N}"
        parts = title_tag.get_text(strip=True).split("Chapter")[0].strip().split()
        # Drop "King", "James", "Bible", "1611" (first 4 words)
        if len(parts) > 4:
            book_name = " ".join(parts[4:])

    return soup, None, book_name, displayed_chapter

def scrape_bible():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    print(f"Starting download. Files will be saved to '{OUTPUT_DIR}'...\n")

    seen_book_names = set()  # Track book names seen at chapter 1 to detect wrap-around

    for book in range(1, MAX_BOOKS + 1):
        chapter = 1

        while True:
            url = BASE_URL.format(book=book, chapter=chapter)
            filename = f"{book:02d}_{chapter:03d}.htm"
            filepath = os.path.join(OUTPUT_DIR, filename)

            # Skip already-downloaded files so the script can resume
            if os.path.exists(filepath):
                # For chapter 1, still register the book name from the saved file
                if chapter == 1:
                    with open(filepath, "r", encoding="utf-8") as f:
                        saved_soup = BeautifulSoup(f.read(), 'html.parser')
                    title_tag = saved_soup.find("title")
                    if title_tag:
                        parts = title_tag.get_text(strip=True).split("Chapter")[0].strip().split()
                        if len(parts) > 4:
                            seen_book_names.add(" ".join(parts[4:]))
                print(f"Skipping (already exists): {filename}")
                chapter += 1
                continue

            try:
                response = requests.get(url, headers=HEADERS)
                soup, end_reason, book_name, displayed_chapter = get_page_info(response, url, chapter)

                # Extra check for chapter 1: detect book wrap-around by comparing book name
                if chapter == 1 and end_reason is None and book_name and book_name in seen_book_names:
                    end_reason = "end_of_bible"

                if end_reason:
                    # Confirm with one retry to avoid acting on a transient server error
                    print(f"  End signal for Book {book:02d} Ch {chapter} — confirming in 3s...")
                    time.sleep(3)
                    response2 = requests.get(url, headers=HEADERS)
                    soup2, end_reason2, book_name2, _ = get_page_info(response2, url, chapter)

                    if chapter == 1 and end_reason2 is None and book_name2 and book_name2 in seen_book_names:
                        end_reason2 = "end_of_bible"

                    if end_reason2 is None:
                        # Transient glitch — the chapter is valid. Save and continue.
                        print(f"  Transient glitch confirmed — saving {filename} and continuing.")
                        if chapter == 1 and book_name2:
                            seen_book_names.add(book_name2)
                        with open(filepath, "w", encoding="utf-8") as file:
                            file.write(response2.text)
                        print(f"Successfully downloaded: {filename}")
                        chapter += 1
                        time.sleep(0.5)
                        continue

                    if end_reason2 == "end_of_bible":
                        print("--- No more books found. Scraping complete! ---")
                        return
                    else:
                        print(f"--- Finished Book {book:02d} (Total chapters: {chapter - 1}) ---\n")
                        break

                # Valid chapter — register book name and save
                if chapter == 1 and book_name:
                    seen_book_names.add(book_name)

                with open(filepath, "w", encoding="utf-8") as file:
                    file.write(response.text)

                print(f"Successfully downloaded: {filename}")
                chapter += 1
                time.sleep(0.5)  # Polite delay

            except requests.exceptions.RequestException as e:
                print(f"Network error while accessing {url}: {e}")
                print("Retrying in 5 seconds...")
                time.sleep(5)

if __name__ == "__main__":
    scrape_bible()
