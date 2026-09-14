/**
 * Example configurations for the gallery
 * Inspired by https://pandastutor.com/
 */

export interface Example {
  id: string;
  title: string;
  description: string;
  category: 'basics' | 'filtering' | 'sorting' | 'grouping' | 'joining' | 'transforming' | 'plotting';
  operations: string[]; // List of operations demonstrated
  markdown: string; // Note shown in the markdown cell above the code
  cells: string[]; // One entry per code cell, run top to bottom
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana'),
    'Age', make_array(20, 21, 20, 22),
    'Major', make_array('CS', 'Math', 'CS', 'Physics'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7)
)
students`,
      `# Select just Name and GPA columns
result = students.select('Name', 'GPA')
result`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7, 3.5)
)
students`,
      `# Filter for CS majors only
cs_students = students.where('Major', 'CS')
cs_students`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7)
)
students`,
      `# Sort by GPA (highest first)
sorted_students = students.sort('GPA', descending=True)
sorted_students`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie'),
    'Score', make_array(85, 92, 78)
)
students`,
      `# Add a Pass/Fail column
grades = make_array('Pass', 'Pass', 'Pass')
result = students.with_column('Grade', grades)
result`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie'),
    'Age', make_array(20, 21, 20),
    'Major', make_array('CS', 'Math', 'CS'),
    'GPA', make_array(3.8, 3.6, 3.9)
)
students`,
      `# Remove the Age column
result = students.drop('Age')
result`
    ]
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
    cells: [
      `from datascience import *
import numpy as np`,
      `# Sales data
sales = Table().with_columns(
    'Product', make_array('Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget'),
    'Amount', make_array(100, 150, 120, 90, 180, 110)
)
sales`,
      `# Group by product and sum amounts
totals = sales.group('Product', sum)
totals`
    ]
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
    cells: [
      `from datascience import *`,
      `# Student names and majors
students = Table().with_columns(
    'ID', make_array(1, 2, 3),
    'Name', make_array('Alice', 'Bob', 'Charlie'),
    'Major', make_array('CS', 'Math', 'CS')
)
students`,
      `# Student grades
grades = Table().with_columns(
    'ID', make_array(1, 2, 3),
    'GPA', make_array(3.8, 3.6, 3.9)
)
grades`,
      `# Join on ID
result = students.join('ID', grades)
result`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7, 3.5),
    'Year', make_array(2, 3, 2, 4, 3)
)
students`,
      `# Chain: filter CS majors, select Name and GPA, sort by GPA
result = (students
    .where('Major', 'CS')
    .select('Name', 'GPA')
    .sort('GPA', descending=True))
result`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math', 'CS'),
    'GPA', make_array(3.8, 3.6, 3.9, 3.7, 3.5, 3.4),
    'Year', make_array(2, 3, 2, 4, 3, 1)
)
students`,
      `# Filter for CS majors
cs_students = students.where('Major', 'CS')
cs_students`,
      `# Then filter for GPA > 3.5
high_gpa = cs_students.where('GPA', are.above(3.5))
high_gpa`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sales data by region and product
sales = Table().with_columns(
    'Region', make_array('North', 'South', 'North', 'South', 'North', 'South'),
    'Product', make_array('Widget', 'Widget', 'Gadget', 'Gadget', 'Widget', 'Gadget'),
    'Sales', make_array(100, 120, 150, 140, 110, 160)
)
sales`,
      `# Pivot to show regions as rows, products as columns
pivoted = sales.pivot('Product', 'Region', 'Sales', sum)
pivoted`
    ]
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
    cells: [
      `from datascience import *
import numpy as np`,
      `# Student scores by major
scores = Table().with_columns(
    'Major', make_array('CS', 'Math', 'CS', 'Math', 'CS', 'Physics', 'Math'),
    'Score', make_array(85, 90, 92, 88, 87, 95, 89)
)
scores`,
      `# Group by major and compute average
avg_scores = scores.group('Major', np.mean)
avg_scores`,
      `# Group by major and compute maximum
max_scores = scores.group('Major', max)
max_scores`
    ]
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
    cells: [
      `from datascience import *`,
      `# Student enrollment info
enrollment = Table().with_columns(
    'StudentID', make_array(1, 2, 3, 4),
    'Course', make_array('CS101', 'MATH101', 'CS101', 'PHYS101'),
    'Grade', make_array('A', 'B', 'A', 'A')
)
enrollment`,
      `# Student information
students = Table().with_columns(
    'StudentID', make_array(1, 2, 3, 4),
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics')
)
students`,
      `# Join on StudentID
result = students.join('StudentID', enrollment)
result`
    ]
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
    cells: [
      `from datascience import *
import numpy as np`,
      `# Sales transactions
transactions = Table().with_columns(
    'Product', make_array('Widget', 'Gadget', 'Widget', 'Gizmo', 'Gadget', 'Widget', 'Gizmo'),
    'Category', make_array('Electronics', 'Electronics', 'Electronics', 'Home', 'Electronics', 'Electronics', 'Home'),
    'Amount', make_array(100, 150, 120, 90, 180, 110, 85),
    'Region', make_array('North', 'South', 'North', 'North', 'South', 'North', 'South')
)
transactions`,
      `# Filter Electronics, group by Product, then sort
result = (transactions
    .where('Category', 'Electronics')
    .select('Product', 'Amount', 'Region')
    .group('Product', np.sum)
    .sort('Amount sum', descending=True))
result`
    ]
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
    cells: [
      `from datascience import *`,
      `# Sample student data
students = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'),
    'Age', make_array(20, 21, 20, 22, 19, 21, 20),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'Math', 'CS', 'Physics')
)
students`,
      `# Take first 3 rows
sample = students.take(3)
sample`
    ]
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
    cells: [
      `from datascience import *`,
      `# Exam scores by student, subject, and semester
scores = Table().with_columns(
    'Student', make_array('Alice', 'Bob', 'Alice', 'Bob', 'Charlie', 'Charlie'),
    'Subject', make_array('Math', 'Math', 'Science', 'Science', 'Math', 'Science'),
    'Score', make_array(85, 90, 88, 92, 87, 89)
)
scores`,
      `# Pivot to show students as rows, subjects as columns
pivoted = scores.pivot('Subject', 'Student', 'Score', sum)
pivoted`
    ]
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
    cells: [
      `from datascience import *
import numpy as np`,
      `# Sales data by region
sales = Table().with_columns(
    'Region', make_array('North', 'South', 'North', 'South', 'East', 'East', 'North'),
    'Amount', make_array(100, 150, 120, 180, 90, 110, 130)
)
sales`,
      `# Group by region and compute sum
total_by_region = sales.group('Region', sum)
total_by_region`,
      `# Group by region and compute mean
avg_by_region = sales.group('Region', np.mean)
avg_by_region`
    ]
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
    cells: [
      `from datascience import *
import numpy as np`,
      `# Employee performance data
employees = Table().with_columns(
    'Name', make_array('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
    'Department', make_array('Sales', 'Engineering', 'Sales', 'Engineering', 'Sales', 'Engineering'),
    'Score', make_array(85, 92, 78, 95, 88, 90),
    'Years', make_array(2, 5, 1, 4, 3, 6)
)
employees`,
      `# Filter experienced employees (Years >= 3)
experienced = employees.where('Years', are.above_or_equal_to(3))
experienced`,
      `# Group by department and compute average score
dept_avg = experienced.group('Department', np.mean)
dept_avg`,
      `# Sort by average score
sorted_dept = dept_avg.sort('Score mean', descending=True)
sorted_dept`,
      `# Select relevant columns
final = sorted_dept.select('Department', 'Score mean')
final`
    ]
  },
  {
    id: 'scatter-plot',
    title: 'Scatter Plot',
    description: 'Plot two numerical columns against each other',
    markdown: `## Scatter plot

\`scatter(x_column, y_column)\` draws one point per row. It is the first thing to try when you want to know whether two numerical variables are related.

\`fit_line=True\` adds the least-squares regression line. Look at how closely the points follow it: hours studied and exam score are strongly associated here.`,
    category: 'plotting',
    operations: ['scatter'],
    cells: [
      `from datascience import *
import numpy as np
import matplotlib.pyplot as plots
plots.style.use('fivethirtyeight')`,
      `# Hours studied and exam score for eight students
study = Table().with_columns(
    'Hours', make_array(1, 2, 2.5, 3, 4, 5, 6, 7),
    'Score', make_array(52, 58, 61, 66, 70, 78, 84, 90)
)
study`,
      `# One point per row, plus the line of best fit
study.scatter('Hours', 'Score', fit_line=True)`
    ]
  },
  {
    id: 'histogram',
    title: 'Histogram',
    description: 'See the distribution of one numerical column',
    markdown: `## Histogram

\`hist(column, bins=...)\` shows how the values of one column are distributed. Each bar covers a bin, and the bins are half-open: the bin \`[21, 24)\` contains 21, 22 and 23 but not 24.

The vertical axis is percent per unit, so the *area* of a bar is the percent of rows in that bin. That is why the bars stay comparable even when bins have different widths.`,
    category: 'plotting',
    operations: ['hist'],
    cells: [
      `from datascience import *
import numpy as np
import matplotlib.pyplot as plots
plots.style.use('fivethirtyeight')`,
      `# Ages of twelve students
ages = Table().with_columns(
    'Name', make_array('Ana', 'Ben', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kim', 'Lee'),
    'Age', make_array(19, 20, 20, 21, 21, 21, 22, 22, 23, 24, 26, 29)
)
ages`,
      `# Bins of width 3, starting at 18
ages.hist('Age', bins=np.arange(18, 31, 3))`
    ]
  },
  {
    id: 'bar-chart',
    title: 'Bar Chart',
    description: 'Compare counts across categories',
    markdown: `## Bar chart

Categorical data is summarised with \`group\`, which produces one row per category and a \`count\` column. \`barh(category_column)\` then draws one horizontal bar per row, using the category column for the labels and the remaining numerical columns for the bar lengths.

Sorting the grouped table first makes the chart easier to read. Step through the visualization to watch the rows collapse into groups before the chart is drawn.`,
    category: 'plotting',
    operations: ['group', 'sort', 'barh'],
    cells: [
      `from datascience import *
import numpy as np
import matplotlib.pyplot as plots
plots.style.use('fivethirtyeight')`,
      `# Declared majors of ten students
majors = Table().with_columns(
    'Name', make_array('Ana', 'Ben', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ivy', 'Jo'),
    'Major', make_array('CS', 'Math', 'CS', 'Physics', 'CS', 'Math', 'CS', 'Econ', 'Math', 'CS')
)
majors`,
      `# One row per major with how many students chose it
counts = majors.group('Major')
counts`,
      `# Largest first, then one bar per row
counts.sort('count', descending=True).barh('Major')`
    ]
  },
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
  { id: 'plotting', name: 'Plotting', description: 'Draw charts from a table' },
] as const;

