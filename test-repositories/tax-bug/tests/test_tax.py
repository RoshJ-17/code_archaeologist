import unittest
from src.tax import calculate_total

class TestTax(unittest.TestCase):
    def test_tax_is_percentage(self):
        self.assertAlmostEqual(calculate_total(200, 10), 220)

if __name__ == "__main__":
    unittest.main()
