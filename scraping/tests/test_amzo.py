import json
from scraping.spiders.amazon import AmazonScraper

def run_test():
    # Liste ultra-complète de mots-clés pour capter un maximum de laptops
    queries = [
        "ordinateur portable", 
        "pc gamer", 
        "macbook", 
        "macbook pro",
        "macbook air",
        "ordinateur hp",
        "ordinateur lenovo",
        "ultrabook",
        "chromebook",
        "pc portable asus",
        "ordinateur portable dell",
        "pc portable acer",
        "pc portable msi",
        "ordinateur portable etudiant",
        "ordinateur portable professionnel",
        "pc portable pas cher",
        "notebook pc",
        "ordinateur portable i7",
        "ordinateur portable rtx",
         # Marques & Gammes
        "surface laptop",
    "microsoft surface",
    "huawei matebook",
    "xiaomi redmibook",
    "thinkpad",
    "lenovo ideapad",
    "lenovo yoga",
    "dell xps",
    "dell latitude",
    "dell inspiron",
    "hp pavilion",
    "hp envy",
    "hp elitebook",
    "hp omen",
    "acer predator",
    "acer swift",
    "acer aspire",
    "asus rog",
    "asus zenbook",
    "asus vivobook",
    "asus tuf",
    "msi stealth",
    "msi katana",
    "msi creator",
    "apple mac",
    
    # Spécifications techniques
    "pc portable i5",
    "pc portable i9",
    "pc portable ryzen 5",
    "pc portable ryzen 7",
    "pc portable ryzen 9",
    "pc portable 16 go ram",
    "pc portable 32 go ram",
    "pc portable ssd",
    "pc portable 1 to",
    "pc portable rtx 3060",
    "pc portable rtx 4070",
    "pc portable rtx 4090",
    "pc portable gtx 1660",
    "pc portable gtx",
    "pc portable ecran 15 pouces",
    "pc portable ecran 17 pouces",
    "pc portable ecran 13 pouces",
    "pc portable ecran 14 pouces",
    "pc portable 144hz",
    "pc portable 120hz",
    "pc portable oled",
    "pc portable 4k",
    "pc portable full hd",
    "pc portable intel core",
    "pc portable amd",

    ]
    
    scraper = AmazonScraper()
    
    # max_pages augmenté à 20 (Amazon bloque souvent l'affichage au-delà de 7 à 20 pages de toute façon)
    # 20 mots-clés * 20 pages = 400 pages à scrapper !
    results = scraper.scrape(queries, max_pages=20)
    
    if results:
        # Affichage du JSON pur dans le terminal
        print(json.dumps(results, indent=4, ensure_ascii=False))
        # Export CSV en parallèle
        scraper.export_to_csv(results)
    else:
        print(json.dumps({"error": "Aucun résultat trouvé ou blocage par Amazon (CAPTCHA possible)."}, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    run_test()