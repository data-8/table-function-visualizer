/**
 * Example configurations for the gallery
 * Inspired by https://pandastutor.com/
 */

export interface Example {
  id: string;
  title: string;
  description: string;
  category: 'basics' | 'filtering' | 'sorting' | 'grouping' | 'joining' | 'transforming';
  operations: string[]; // List of operations demonstrated
  code: string;
  thumbnail?: string;
}

export const examples: Example[] = [
  {
    id: 'select-columns',
    title: 'Selecting Columns',
    description: 'Choose specific columns from a table',
    category: 'basics',
    operations: ['select'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana'],
    'Age', [20, 21, 20, 22],
    'Major', ['CS', 'Math', 'CS', 'Physics'],
    'GPA', [3.8, 3.6, 3.9, 3.7]
)

print("Original table:")
students.show()

# Select just Name and GPA columns
result = students.select('Name', 'GPA')

print("\\nAfter selecting Name and GPA:")
result.show()
`
  },
  
  {
    id: 'filter-rows',
    title: 'Filtering Rows',
    description: 'Keep only rows that match a condition',
    category: 'filtering',
    operations: ['where'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'Major', ['CS', 'Math', 'CS', 'Physics', 'Math'],
    'GPA', [3.8, 3.6, 3.9, 3.7, 3.5]
)

print("Original table:")
students.show()

# Filter for CS majors only
cs_students = students.where('Major', 'CS')

print("\\nCS majors only:")
cs_students.show()
`
  },
  
  {
    id: 'sort-values',
    title: 'Sorting by Values',
    description: 'Order rows by a column',
    category: 'sorting',
    operations: ['sort'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana'],
    'GPA', [3.8, 3.6, 3.9, 3.7]
)

print("Original table:")
students.show()

# Sort by GPA (highest first)
sorted_students = students.sort('GPA', descending=True)

print("\\nSorted by GPA (highest first):")
sorted_students.show()
`
  },
  
  {
    id: 'add-column',
    title: 'Adding a Column',
    description: 'Add a new column to the table',
    category: 'transforming',
    operations: ['with_column'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie'],
    'Score', [85, 92, 78]
)

print("Original table:")
students.show()

# Add a Pass/Fail column
grades = ['Pass', 'Pass', 'Pass']
result = students.with_column('Grade', grades)

print("\\nWith Grade column added:")
result.show()
`
  },
  
  {
    id: 'drop-column',
    title: 'Dropping Columns',
    description: 'Remove columns from a table',
    category: 'basics',
    operations: ['drop'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie'],
    'Age', [20, 21, 20],
    'Major', ['CS', 'Math', 'CS'],
    'GPA', [3.8, 3.6, 3.9]
)

print("Original table:")
students.show()

# Remove the Age column
result = students.drop('Age')

print("\\nWithout Age column:")
result.show()
`
  },
  
  {
    id: 'group-aggregate',
    title: 'Grouping and Aggregating',
    description: 'Group rows and compute statistics',
    category: 'grouping',
    operations: ['group'],
    code: `from datascience import Table
import numpy as np

# Sales data
sales = Table().with_columns(
    'Product', ['Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget'],
    'Amount', [100, 150, 120, 90, 180, 110]
)

print("Original sales data:")
sales.show()

# Group by product and sum amounts
totals = sales.group('Product', sum)

print("\\nTotal sales by product:")
totals.show()
`
  },
  
  {
    id: 'join-tables',
    title: 'Joining Tables',
    description: 'Combine two tables on a common column',
    category: 'joining',
    operations: ['join'],
    code: `from datascience import Table

# Student names and majors
students = Table().with_columns(
    'ID', [1, 2, 3],
    'Name', ['Alice', 'Bob', 'Charlie'],
    'Major', ['CS', 'Math', 'CS']
)

# Student grades
grades = Table().with_columns(
    'ID', [1, 2, 3],
    'GPA', [3.8, 3.6, 3.9]
)

print("Students table:")
students.show()

print("\\nGrades table:")
grades.show()

# Join on ID
result = students.join('ID', grades)

print("\\nJoined table:")
result.show()
`
  },
  
  {
    id: 'chain-operations',
    title: 'Chaining Operations',
    description: 'Combine multiple operations in sequence',
    category: 'basics',
    operations: ['select', 'where', 'sort'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'Major', ['CS', 'Math', 'CS', 'Physics', 'Math'],
    'GPA', [3.8, 3.6, 3.9, 3.7, 3.5],
    'Year', [2, 3, 2, 4, 3]
)

print("Original table:")
students.show()

# Chain: filter CS majors, select Name and GPA, sort by GPA
result = (students
    .where('Major', 'CS')
    .select('Name', 'GPA')
    .sort('GPA', descending=True))

print("\\nCS majors with highest GPAs:")
result.show()
`
  },
  
  {
    id: 'multiple-filters',
    title: 'Multiple Filters',
    description: 'Apply multiple where conditions',
    category: 'filtering',
    operations: ['where'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
    'Major', ['CS', 'Math', 'CS', 'Physics', 'Math', 'CS'],
    'GPA', [3.8, 3.6, 3.9, 3.7, 3.5, 3.4],
    'Year', [2, 3, 2, 4, 3, 1]
)

print("Original table:")
students.show()

# Filter for CS majors
cs_students = students.where('Major', 'CS')

print("\\nStep 1 - CS majors:")
cs_students.show()

# Then filter for GPA > 3.5
from datascience import are
high_gpa = cs_students.where('GPA', are.above(3.5))

print("\\nStep 2 - CS majors with GPA > 3.5:")
high_gpa.show()
`
  },
  
  {
    id: 'pivot-table',
    title: 'Pivot Tables',
    description: 'Reshape data with pivot operations',
    category: 'transforming',
    operations: ['pivot'],
    code: `from datascience import Table

# Sales data by region and product
sales = Table().with_columns(
    'Region', ['North', 'South', 'North', 'South', 'North', 'South'],
    'Product', ['Widget', 'Widget', 'Gadget', 'Gadget', 'Widget', 'Gadget'],
    'Sales', [100, 120, 150, 140, 110, 160]
)

print("Original sales data:")
sales.show()

# Pivot to show regions as rows, products as columns
pivoted = sales.pivot('Product', 'Region', 'Sales', sum)

print("\\nPivoted table (Products as columns):")
pivoted.show()
`
  },
  
  {
    id: 'group-multiple',
    title: 'Group with Multiple Aggregates',
    description: 'Group by column and compute multiple statistics',
    category: 'grouping',
    operations: ['group'],
    code: `from datascience import Table
import numpy as np

# Student scores by major
scores = Table().with_columns(
    'Major', ['CS', 'Math', 'CS', 'Math', 'CS', 'Physics', 'Math'],
    'Score', [85, 90, 92, 88, 87, 95, 89]
)

print("Original scores:")
scores.show()

# Group by major and compute average
avg_scores = scores.group('Major', np.mean)

print("\\nAverage scores by major:")
avg_scores.show()

# Group by major and compute maximum
max_scores = scores.group('Major', max)

print("\\nMaximum scores by major:")
max_scores.show()
`
  },
  
  {
    id: 'join-multiple-keys',
    title: 'Joining on Multiple Keys',
    description: 'Join tables with multiple matching columns',
    category: 'joining',
    operations: ['join'],
    code: `from datascience import Table

# Student enrollment info
enrollment = Table().with_columns(
    'StudentID', [1, 2, 3, 4],
    'Course', ['CS101', 'MATH101', 'CS101', 'PHYS101'],
    'Grade', ['A', 'B', 'A', 'A']
)

# Student information
students = Table().with_columns(
    'StudentID', [1, 2, 3, 4],
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana'],
    'Major', ['CS', 'Math', 'CS', 'Physics']
)

print("Enrollment table:")
enrollment.show()

print("\\nStudents table:")
students.show()

# Join on StudentID
result = students.join('StudentID', enrollment)

print("\\nJoined table:")
result.show()
`
  },
  
  {
    id: 'complex-workflow',
    title: 'Complex Workflow',
    description: 'Combine multiple advanced operations',
    category: 'basics',
    operations: ['select', 'where', 'group', 'sort', 'join'],
    code: `from datascience import Table
import numpy as np

# Sales transactions
transactions = Table().with_columns(
    'Product', ['Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget', 'Gizmo'],
    'Category', ['Electronics', 'Electronics', 'Electronics', 'Home', 'Electronics', 'Electronics', 'Home'],
    'Amount', [100, 150, 120, 90, 180, 110, 85],
    'Region', ['North', 'South', 'North', 'North', 'South', 'North', 'South']
)

print("Original transactions:")
transactions.show()

# Filter Electronics, group by Product, then sort
result = (transactions
    .where('Category', 'Electronics')
    .select('Product', 'Amount', 'Region')
    .group('Product', np.sum)
    .sort('Amount sum', descending=True))

print("\\nElectronics products by total sales (sorted):")
result.show()
`
  },
  
  {
    id: 'take-sample',
    title: 'Taking Sample Rows',
    description: 'Select a specific number of rows from a table',
    category: 'basics',
    operations: ['take'],
    code: `from datascience import Table

# Sample student data
students = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'],
    'Age', [20, 21, 20, 22, 19, 21, 20],
    'Major', ['CS', 'Math', 'CS', 'Physics', 'Math', 'CS', 'Physics']
)

print("Original table:")
students.show()

# Take first 3 rows
sample = students.take(3)

print("\\nFirst 3 rows:")
sample.show()
`
  },
  
  {
    id: 'pivot-complex',
    title: 'Complex Pivot Operation',
    description: 'Reshape data with multiple dimensions',
    category: 'transforming',
    operations: ['pivot'],
    code: `from datascience import Table

# Exam scores by student, subject, and semester
scores = Table().with_columns(
    'Student', ['Alice', 'Bob', 'Alice', 'Bob', 'Charlie', 'Charlie'],
    'Subject', ['Math', 'Math', 'Science', 'Science', 'Math', 'Science'],
    'Score', [85, 90, 88, 92, 87, 89]
)

print("Original scores:")
scores.show()

# Pivot to show students as rows, subjects as columns
pivoted = scores.pivot('Subject', 'Student', 'Score', sum)

print("\\nPivoted (Students × Subjects):")
pivoted.show()
`
  },
  
  {
    id: 'group-with-aggregate',
    title: 'Group with Custom Aggregate',
    description: 'Group data and apply custom aggregation functions',
    category: 'grouping',
    operations: ['group'],
    code: `from datascience import Table
import numpy as np

# Sales data by region
sales = Table().with_columns(
    'Region', ['North', 'South', 'North', 'South', 'East', 'East', 'North'],
    'Amount', [100, 150, 120, 180, 90, 110, 130]
)

print("Original sales:")
sales.show()

# Group by region and compute sum
total_by_region = sales.group('Region', sum)

print("\\nTotal sales by region:")
total_by_region.show()

# Group by region and compute mean
avg_by_region = sales.group('Region', np.mean)

print("\\nAverage sales by region:")
avg_by_region.show()
`
  },
  
  {
    id: 'multi-step-analysis',
    title: 'Multi-Step Data Analysis',
    description: 'Complete workflow: filter, group, sort, and select',
    category: 'basics',
    operations: ['where', 'group', 'sort', 'select'],
    code: `from datascience import Table
import numpy as np

# Employee performance data
employees = Table().with_columns(
    'Name', ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'],
    'Department', ['Sales', 'Engineering', 'Sales', 'Engineering', 'Sales', 'Engineering'],
    'Score', [85, 92, 78, 95, 88, 90],
    'Years', [2, 5, 1, 4, 3, 6]
)

print("Original employee data:")
employees.show()

# Filter experienced employees (Years >= 3)
from datascience import are
experienced = employees.where('Years', are.above_or_equal_to(3))

print("\\nStep 1 - Experienced employees:")
experienced.show()

# Group by department and compute average score
dept_avg = experienced.group('Department', np.mean)

print("\\nStep 2 - Average score by department:")
dept_avg.show()

# Sort by average score
sorted_dept = dept_avg.sort('Score mean', descending=True)

print("\\nStep 3 - Departments sorted by average score:")
sorted_dept.show()

# Select relevant columns
final = sorted_dept.select('Department', 'Score mean')

print("\\nStep 4 - Final result:")
final.show()
`
  }
];

export function getExamplesByCategory(category: Example['category']): Example[] {
  return examples.filter(ex => ex.category === category);
}

export function getExampleById(id: string): Example | undefined {
  return examples.find(ex => ex.id === id);
}

export const categories = [
  { id: 'basics', name: 'Basics', description: 'Fundamental table operations' },
  { id: 'filtering', name: 'Filtering', description: 'Select rows by conditions' },
  { id: 'sorting', name: 'Sorting', description: 'Order rows by values' },
  { id: 'grouping', name: 'Grouping', description: 'Aggregate and summarize' },
  { id: 'joining', name: 'Joining', description: 'Combine multiple tables' },
  { id: 'transforming', name: 'Transforming', description: 'Modify table structure' },
] as const;

