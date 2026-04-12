def remove_duplicates(products):
    seen = set()
    result = []

    for p in products:
        key = (p["title"], p["price"], p["source"])

        if key not in seen:
            seen.add(key)
            result.append(p)

    return result