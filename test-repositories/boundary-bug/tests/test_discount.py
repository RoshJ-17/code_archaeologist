import unittest
from src.discount import get_discount

class TestDiscount(unittest.TestCase):
    def test_discount_starts_at_five_items(self):
        self.assertEqual(get_discount(5), 0.10)

if __name__ == "__main__":
    unittest.main()
