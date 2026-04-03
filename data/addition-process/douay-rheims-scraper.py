import os
import requests
import time
from bs4 import BeautifulSoup

# Configuration
BASE_URL = "https://www.drbo.org/chapter/{book:02d}{chapter:03d}.htm"
OUTPUT_DIR = "douay-rheims-scraped"
TOTAL_BOOKS = 73

# Headers to mimic a standard web browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

def scrape_bible():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    print(f"Starting download. Files will be saved to '{OUTPUT_DIR}'...\n")

    for book in range(1, TOTAL_BOOKS + 1):
        chapter = 1
        
        while True:
            url = BASE_URL.format(book=book, chapter=chapter)
            filename = f"{book:02d}{chapter:03d}.htm"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            try:
                response = requests.get(url, headers=HEADERS)
                
                # 1. Check if the site redirected us away from our requested URL
                if response.url != url:
                    print(f"--- Finished Book {book:02d} (Redirect detected). Total chapters: {chapter - 1} ---\n")
                    break
                
                # Parse the HTML to check the actual content
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract the page title
                title_text = soup.title.string if soup.title else ""
                
                # 2. Check for the "Soft 404" empty template
                # Real chapters on this site have titles like "Douay-Rheims Bible, Genesis Chapter 1"
                # If "Chapter" is missing, or if the page has barely any text, it's a fake page.
                visible_text = soup.get_text(strip=True)
                
                if "Chapter" not in title_text or len(visible_text) < 500:
                    print(f"--- Finished Book {book:02d} (End of chapters reached). Total: {chapter - 1} ---\n")
                    break

                # If it passes the checks, save the valid HTML content
                with open(filepath, "w", encoding="utf-8") as file:
                    file.write(response.text)
                
                print(f"Successfully downloaded: {filename}")
                
                chapter += 1
                time.sleep(0.5) # Polite delay
                    
            except requests.exceptions.RequestException as e:
                print(f"Network error while accessing {url}: {e}")
                print("Retrying in 5 seconds...")
                time.sleep(5)

    print("Scraping completed successfully!")

if __name__ == "__main__":
    scrape_bible()
