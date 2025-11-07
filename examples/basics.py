# Basic Table Operations Example

from datascience import Table

# Create a table with student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'Age', [20, 21, 20, 22, 21],
    'Major', ['CS', 'Math', 'CS', 'Physics', 'Math'],
    'GPA', [3.8, 3.6, 3.9, 3.7, 3.5]
)

print("Original table:")
students.show()

# Select specific columns
print("\n1. Select: Getting just names and GPAs")
names_gpas = students.select('Name', 'GPA')
names_gpas.show()

# Filter rows with where
print("\n2. Where: Finding CS majors")
cs_students = students.where('Major', 'CS')
cs_students.show()

# Sort by a column
print("\n3. Sort: Ordering by GPA (highest first)")
sorted_by_gpa = students.sort('GPA', descending=True)
sorted_by_gpa.show()

# Add a new column
print("\n4. With Column: Adding a 'Year' column")
with_year = students.with_column('Year', [2, 3, 2, 4, 3])
with_year.show()

# Drop a column
print("\n5. Drop: Removing the Age column")
without_age = students.drop('Age')
without_age.show()

# Chain operations
print("\n6. Chaining: CS majors with high GPA, sorted")
result = students.where('Major', 'CS').where('GPA', are.above(3.7)).sort('Name')
result.show()

print("\n✅ Example complete! Check the trace timeline to see each operation.")

