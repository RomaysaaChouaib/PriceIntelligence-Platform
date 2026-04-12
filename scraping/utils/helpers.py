def clean_price(text):
    text = text.replace("MAD", "").replace(",", "").strip()

    digits = ""
    for c in text:
        if c.isdigit():
            digits += c

    if digits:
        return int(digits)
    return 0