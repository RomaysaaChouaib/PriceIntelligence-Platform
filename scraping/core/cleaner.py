def remove_duplicates(products):
    seen = set()
    result = []

    for p in products:
        key = (p["title"].lower().strip(),round(p["price"], 0),p["source"])

        if key not in seen:
            seen.add(key)
            result.append(p)

    return result