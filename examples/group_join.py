# Group and Join Operations Example

from datascience import Table

# Sales data
sales = Table().with_columns(
    'Product', ['Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget'],
    'Region', ['East', 'West', 'East', 'West', 'East', 'West'],
    'Amount', [100, 150, 120, 90, 180, 110]
)

print("Sales data:")
sales.show()

# Group by product and sum
print("\n1. Group: Total sales by product")
by_product = sales.group('Product', sum)
by_product.show()

# Group by region
print("\n2. Group: Total sales by region")
by_region = sales.group('Region', sum)
by_region.show()

# Product information table
products = Table().with_columns(
    'Product', ['Widget', 'Gadget', 'Gizmo'],
    'Category', ['Tools', 'Electronics', 'Tools'],
    'Price', [50, 75, 45]
)

print("\n3. Product info:")
products.show()

# Join sales with product info
print("\n4. Join: Combining sales with product details")
combined = by_product.join('Product', products)
combined.show()

print("\n✅ Example complete! See how group and join work in the trace.")

