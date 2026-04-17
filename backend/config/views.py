from django.http import JsonResponse
from scraping.core.scraper import JumiaScraper

def search_view(request):
    query = request.GET.get("query", "pc portable")

    scraper = JumiaScraper()
    products = scraper.scrape(query)
    scraper.export_to_csv(products, "resultats_frontend.csv")

    return JsonResponse({
        "products": products
    })