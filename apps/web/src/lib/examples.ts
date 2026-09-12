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
  markdown: string; // Note shown in the markdown cell above the code
  code: string;
  thumbnail?: string;
}

export const examples: Example[] = [
  {
    id: 'select-columns',
    title: 'Selecting Columns',
    description: 'Choose specific columns from a table',
    markdown: `## Selecting columns

\`select\` builds a new table containing only the columns you name, in the order you name them. The original table is left untouched. That is true of every \`Table\` method.

Step through the visualization and notice that the number of rows never changes; only the columns do.`,
    category: 'basics',
    operations: ['select'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana'),
    'Age', make_array(20, 21, 20, 22),
    'Major', make_array('CS', 'Math', 'CS', 'Physics'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7)
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
    markdown: `## Filtering rows with \`where\`

\`where(column, value)\` keeps only the rows whose value in that column matches. Here we keep the CS majors.

As you step through, watch each row get checked against the condition: kept rows are highlighted, and the ones that don't match are struck through before they disappear from the result.`,
    category: 'filtering',
    operations: ['where'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7, 3.5)
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
    markdown: `## Sorting rows

\`sort(column)\` orders the rows by a column, smallest first. Passing \`descending=True\` flips that, so the highest GPA comes out on top.

Every row survives a sort. Only their order changes. Watch the rows move in the step-through.`,
    category: 'sorting',
    operations: ['sort'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7)
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
    markdown: `## Adding a column

\`with_column(label, values)\` returns a copy of the table with one more column. The array of values must have exactly one entry per row, in row order.

Here \`grades\` is an array we build first with \`make_array\`, then attach. Watch the new column appear on the right of the result.`,
    category: 'transforming',
    operations: ['with_column'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie'),
    'Score', make_array(85, 92, 78)
)

print("Original table:")
students.show()

# Add a Pass/Fail column
grades = make_array('Pass', 'Pass', 'Pass')
result = students.with_column('Grade', grades)

print("\\nWith Grade column added:")
result.show()
`
  },
  
  {
    id: 'drop-column',
    title: 'Dropping Columns',
    description: 'Remove columns from a table',
    markdown: `## Dropping columns

\`drop\` is the mirror image of \`select\`: you name the columns you want to get rid of, and everything else stays.

Use it when a table has many columns and it is easier to say what you don't need.`,
    category: 'basics',
    operations: ['drop'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie'),
    'Age', make_array(20, 21, 20),
    'Major', make_array('CS', 'Math', 'CS'),
    'GPA', make_array(3.8, 3.6, 3.9)
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
    markdown: `## Grouping and aggregating

\`group(column, function)\` collects the rows that share a value in the column, then applies the function to each group's values. With \`sum\`, every product ends up with the total of its amounts.

Step through it: first the rows are gathered into groups, then the values in each group are collapsed into one number. Notice the new column is named \`Amount sum\`.`,
    category: 'grouping',
    operations: ['group'],
    code: `from datascience import *
import numpy as np

# Sales data
sales = Table().with_columns(
    'Product', make_array('Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget'),
    'Amount', make_array(100, 150, 120, 90, 180, 110)
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
    markdown: `## Joining two tables

\`join(column, other_table)\` matches rows from two tables that share a value in the named column and lines them up side by side.

Here both tables have an \`ID\` column. Watch the second table appear under the first, with matching keys highlighted as each row is paired up.`,
    category: 'joining',
    operations: ['join'],
    code: `from datascience import *

# Student names and majors
students = Table().with_columns(
    'ID', make_array(1, 2, 3),
    'Name', make_array('Alice', 'Bob', 'Charlie'),
    'Major', make_array('CS', 'Math', 'CS')
)

# Student grades
grades = Table().with_columns(
    'ID', make_array(1, 2, 3),
    'GPA', make_array(3.8, 3.6, 3.9)
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
    markdown: `## Chaining operations

Because every \`Table\` method returns a new table, you can call another method on the result right away. Wrapping the expression in parentheses lets you put each step on its own line.

Read it top to bottom: keep the CS majors, keep only name and GPA, then sort. The visualization shows one step per method call.`,
    category: 'basics',
    operations: ['select', 'where', 'sort'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7, 3.5),
    'Year', make_array(2, 3, 2, 4, 3)
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
    markdown: `## Filtering twice

A second \`where\` on the result of the first narrows things down further. \`are.above(3.5)\` is a *predicate*, a reusable condition, from the \`are\` collection.

Compare the two filter steps: the first checks the Major column, the second checks GPA against a threshold.`,
    category: 'filtering',
    operations: ['where'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math', 'CS'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7, 3.5, 3.4),
    'Year', make_array(2, 3, 2, 4, 3, 1)
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
    markdown: `## Pivoting

\`pivot(columns, rows, values, function)\` turns one column's values into column headers and another's into row labels, then fills each cell by aggregating the \`values\` column.

Here every Product becomes a column and every Region a row, and each cell is the sum of Sales for that pair. Step through to see the source rows feed each cell.`,
    category: 'transforming',
    operations: ['pivot'],
    code: `from datascience import *

# Sales data by region and product
sales = Table().with_columns(
    'Region', make_array('North', 'South', 'North', 'South', 'North', 'South'),
    'Product', make_array('Widget', 'Widget', 'Gadget', 'Gadget', 'Widget', 'Gadget'),
    'Sales', make_array(100, 120, 150, 140, 110, 160)
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
    markdown: `## Different aggregates on the same groups

The function you pass to \`group\` decides what each group collapses to. \`np.mean\` gives the average score per major; \`max\` gives the highest.

The groups are identical in both calls. Only the number in the second column changes, and so does its name: \`Score mean\` versus \`Score max\`.`,
    category: 'grouping',
    operations: ['group'],
    code: `from datascience import *
import numpy as np

# Student scores by major
scores = Table().with_columns(
    'Major', make_array('CS', 'Math', 'CS', 'Math', 'CS', 'Physics', 'Math'),
    'Score', make_array(85, 90, 92, 88, 87, 95, 89)
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
    markdown: `## Joining on an ID

\`StudentID\` is the key that links a student's record to their enrollment. \`join\` pairs each row in \`students\` with the row in \`enrollment\` that has the same ID.

Watch the keys get matched one at a time, and notice the joined table keeps the columns from both.`,
    category: 'joining',
    operations: ['join'],
    code: `from datascience import *

# Student enrollment info
enrollment = Table().with_columns(
    'StudentID', make_array(1, 2, 3, 4),
    'Course', make_array('CS101', 'MATH101', 'CS101', 'PHYS101'),
    'Grade', make_array('A', 'B', 'A', 'A')
)

# Student information
students = Table().with_columns(
    'StudentID', make_array(1, 2, 3, 4),
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics')
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
    markdown: `## A full pipeline

This is the shape of most real analyses: filter down to the rows you care about, select the useful columns, group to summarise, and sort to rank.

Watch how the table changes character at each step, from individual transactions to one row per product. The sort uses \`Amount sum\`, the column that \`group\` created.`,
    category: 'basics',
    operations: ['select', 'where', 'group', 'sort', 'join'],
    code: `from datascience import *
import numpy as np

# Sales transactions
transactions = Table().with_columns(
    'Product', make_array('Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget', 'Gizmo'),
    'Category', make_array('Electronics', 'Electronics', 'Electronics', 'Home', 'Electronics', 'Electronics', 'Home'),
    'Amount', make_array(100, 150, 120, 90, 180, 110, 85),
    'Region', make_array('North', 'South', 'North', 'North', 'South', 'North', 'South')
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
    markdown: `## Taking rows by position

\`take(n)\` returns the first \`n\` rows. You can also pass a specific row number, or a range of them, using \`take(np.arange(start, stop))\`.

Row positions start at 0. Watch the first three rows get picked out and the rest fall away.`,
    category: 'basics',
    operations: ['take'],
    code: `from datascience import *

# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'),
    'Age', make_array(20, 21, 20, 22, 19, 21, 20),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math', 'CS', 'Physics')
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
    markdown: `## Pivoting scores

Each student took each subject once, so the pivot has one row per student and one column per subject, and each cell holds that student's score.

Step through and check that every (student, subject) pair from the original table lands in exactly one cell.`,
    category: 'transforming',
    operations: ['pivot'],
    code: `from datascience import *

# Exam scores by student, subject, and semester
scores = Table().with_columns(
    'Student', make_array('Alice', 'Bob', 'Alice', 'Bob', 'Charlie', 'Charlie'),
    'Subject', make_array('Math', 'Math', 'Science', 'Science', 'Math', 'Science'),
    'Score', make_array(85, 90, 88, 92, 87, 89)
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
    markdown: `## Total versus average

Grouping by Region with \`sum\` gives each region's total; grouping with \`np.mean\` gives its average. The groups are the same, the summary differs.

Notice the group step happens first in both calls, and the aggregation happens after.`,
    category: 'grouping',
    operations: ['group'],
    code: `from datascience import *
import numpy as np

# Sales data by region
sales = Table().with_columns(
    'Region', make_array('North', 'South', 'North', 'South', 'East', 'East', 'North'),
    'Amount', make_array(100, 150, 120, 180, 90, 110, 130)
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
    markdown: `## Filter, group, sort, select

A four-step analysis, one method at a time. Keep employees with at least three years (\`are.above_or_equal_to\`), average each department's scores, rank the departments, then keep just the two columns worth reporting.

Watch the \`Years\` column disappear after the group step: once rows are collapsed into groups, only the aggregated columns remain.`,
    category: 'basics',
    operations: ['where', 'group', 'sort', 'select'],
    code: `from datascience import *
import numpy as np

# Employee performance data
employees = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
    'Department', make_array('Sales', 'Engineering', 'Sales', 'Engineering', 'Sales', 'Engineering'),
    'Score', make_array(85, 92, 78, 95, 88, 90),
    'Years', make_array(2, 5, 1, 4, 3, 6)
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

