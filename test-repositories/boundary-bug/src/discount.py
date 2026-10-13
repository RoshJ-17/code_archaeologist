def get_discount(quantity):
    # BUG: Exactly five items are excluded.
    if quantity > 5:
        return 0.10
    return 0.0
