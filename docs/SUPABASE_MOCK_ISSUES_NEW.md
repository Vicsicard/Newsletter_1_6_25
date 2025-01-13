# Supabase Mock Implementation Issues and Solutions

## Overview
This document tracks issues encountered with the Supabase mock implementation in our testing environment and their solutions.

## Current Status (Jan 6, 2025)
- Core mock implementation complete
- Basic query chaining implemented
- Response handling improved
- Test execution environment issues
- Documentation in progress

## Resolved Issues

### 1. Type Safety
- [x] Fixed type errors in mock query builder
- [x] Added proper typing for table rows
- [x] Implemented correct return types for all methods
- [x] Fixed type issues in integration tests

### 2. Method Chaining
- [x] Implemented proper method chaining for select()
- [x] Added support for eq() method chaining
- [x] Fixed update() method chaining
- [x] Added single() method support

### 3. Response Handling
- [x] Improved error response structure
- [x] Added proper data response formatting
- [x] Fixed null handling in responses
- [x] Implemented correct count handling

## Remaining Tasks

### 1. Query Builder Enhancement
- [ ] Add support for more complex queries (in, not, gt, lt)
- [ ] Implement order() method
- [ ] Add limit() and offset() support
- [ ] Support for joins and relationships

### 2. Error Simulation
- [ ] Add configurable network errors
- [ ] Implement timeout simulation
- [ ] Add rate limiting simulation
- [ ] Support for partial failure scenarios

### 3. Test Coverage
- [ ] Add tests for complex queries
- [ ] Test error scenarios comprehensively
- [ ] Add performance tests
- [ ] Test concurrent operations

### 4. Documentation
- [ ] Document mock configuration options
- [ ] Add usage examples
- [ ] Document limitations and workarounds
- [ ] Create troubleshooting guide

## Best Practices
1. Always reset mock data between tests
2. Use typed data structures for mock responses
3. Keep mock behavior consistent with real Supabase
4. Document any deviations from real behavior

## Future Improvements
1. Consider implementing real-time subscription mocking
2. Add support for storage bucket operations
3. Implement authentication mocking
4. Add support for RPC calls

## Implementation Details

### Mock Query Class
```typescript
interface ChainedCall {
  method: string;
  args: any[];
}

class MockQuery<T> {
  protected chainedCalls: ChainedCall[];
  protected responses: any[];
  
  // Core methods
  from(table: string): this
  select(columns?: string): this
  eq(column: string, value: any): this
  order(column: string, options: { ascending: boolean }): this
  
  // Response handling
  single(): Promise<QueryResponse<T>>
  update(data: Partial<T>): this
  delete(): this
  insert(data: T | T[]): this
}
```

### Response Types
```typescript
interface QueryResponse<T> {
  data: T | null;
  error: Error | null;
}

interface MockResponse<T> {
  success(data: T): QueryResponse<T>;
  error(message: string): QueryResponse<T>;
}
```

## Testing Strategy

### Unit Tests
1. Query chain validation
2. Response handling
3. Error scenarios
4. Edge cases

### Integration Tests
1. Complex queries
2. Transaction handling
3. Error propagation
4. State management

## Known Limitations
1. Complex query combinations not fully supported
2. Some Supabase features not implemented
3. Limited transaction support
4. Simplified error handling

## Common Issues

### 1. Method Chaining Type Safety
**Issue**: TypeScript errors when trying to chain mock methods like `select()`, `eq()`, and `single()`.

**Root Cause**: 
- Mock functions weren't properly returning a type-safe object that matches the Supabase query builder interface
- Jest mock types were conflicting with the expected return types

**Solution**:
```typescript
// Create a shared mock query object
const mockQuery = {
  select,
  eq,
  is,
  isNot,
  single,
  update
};

// Set up method chaining by returning the query object
select.mockImplementation(() => mockQuery);
eq.mockImplementation(() => mockQuery);
is.mockImplementation(() => mockQuery);
isNot.mockImplementation(() => mockQuery);
update.mockImplementation(() => mockQuery);
```

### 2. Method Chaining and `this` Context
**Issue**: Methods like `from()`, `select()`, and `eq()` lose their `this` context during chaining, causing "is not a function" errors.

**Solution Approaches**:

1. **Class-based Mock Implementation**:
```typescript
class MockQuery {
  select = jest.fn(() => this);
  eq = jest.fn(() => this);
  is = jest.fn(() => this);
  isNot = jest.fn(() => this);
  single = jest.fn(() => this);
  update = jest.fn(() => this);
  data: any = null;
  error: any = null;
}

export const createMockSupabaseClient = () => {
  const mockQuery = new MockQuery();
  const mockSupabase = {
    from: jest.fn(() => mockQuery)
  };
  return { client: mockSupabase, query: mockQuery };
};
```

2. **Using mockReturnThis()**:
```typescript
const mockQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis()
};
```

3. **Binding Functions**:
```typescript
const mockQuery = {};
mockQuery.select = jest.fn(() => mockQuery);
mockQuery.eq = jest.fn(() => mockQuery);
mockQuery.single = jest.fn(() => mockQuery);
```

### 3. Mock Response Types
**Issue**: Difficulty in maintaining type safety when mocking Supabase responses.

**Solution**:
```typescript
export const createMockResponse = {
  success: <T>(data: T) => ({
    data,
    error: null
  }),
  error: (message: string) => ({
    data: null,
    error: { message }
  })
};
```

## Best Practices

### 1. Mock Function Implementation
- Use `mockImplementation()` instead of `mockReturnValue()` for complex behaviors
- Return the same mock query object for proper method chaining
- Keep mock implementations simple and focused
- Consider using a class-based approach for better `this` binding

### 2. Type Safety
- Use TypeScript interfaces to define expected shapes
- Leverage type inference where possible
- Use helper functions to create properly typed responses

### 3. Testing Patterns
- Test both success and error cases
- Verify proper method chaining
- Reset mocks between tests
- Test each query builder method independently

## Debugging Tips

1. **Check Method Chaining**:
   - Verify that each method returns the correct object for chaining
   - Use console.log to track the `this` context in each method
   - Ensure mock functions are properly bound

2. **Type Checking**:
   - Use TypeScript's type checking to verify mock shapes
   - Add explicit return types to mock functions
   - Use the `as` keyword carefully when type casting

3. **Common Errors**:
   - "X is not a function": Usually indicates a `this` binding issue
   - Type mismatches: Check the mock implementation matches Supabase types
   - Undefined methods: Verify all required methods are mocked

## Reference Documentation

For detailed information about Jest mock functions and their capabilities, refer to:
- [Jest Mock Functions](https://jestjs.io/docs/mock-function-api)
- [Jest Timer Mocks](https://jestjs.io/docs/timer-mocks)
- [Jest Manual Mocks](https://jestjs.io/docs/manual-mocks)

## Related Files
- `tests/utils/supabase-mock.ts`: Main mock implementation
- `tests/queue-processor.test.ts`: Example usage of mocks
- `tests/newsletter-generator.test.ts`: Example usage of mocks

Postgres Triggers
Automatically execute SQL on table events.
In Postgres, a trigger executes a set of actions automatically on table events such as INSERTs, UPDATEs, DELETEs, or TRUNCATE operations.

Creating a trigger#
Creating triggers involve 2 parts:

A Function which will be executed (called the Trigger Function)
The actual Trigger object, with parameters around when the trigger should be run.
An example of a trigger is:

create trigger "trigger_name"
after insert on "table_name"
for each row
execute function trigger_function();

Trigger functions#
A trigger function is a user-defined Function that Postgres executes when the trigger is fired.

Example trigger function#
Here is an example that updates salary_log whenever an employee's salary is updated:

-- Example: Update salary_log when salary is updated
create function update_salary_log()
returns trigger
language plpgsql
as $$
begin
  insert into salary_log(employee_id, old_salary, new_salary)
  values (new.id, old.salary, new.salary);
  return new;
end;
$$;

create trigger salary_update_trigger
after update on employees
for each row
execute function update_salary_log();

Trigger variables#
Trigger functions have access to several special variables that provide information about the context of the trigger event and the data being modified. In the example above you can see the values inserted into the salary log are old.salary and new.salary - in this case old specifies the previous values and new specifies the updated values.

Here are some of the key variables and options available within trigger functions:

TG_NAME: The name of the trigger being fired.
TG_WHEN: The timing of the trigger event (BEFORE or AFTER).
TG_OP: The operation that triggered the event (INSERT, UPDATE, DELETE, or TRUNCATE).
OLD: A record variable holding the old row's data in UPDATE and DELETE triggers.
NEW: A record variable holding the new row's data in UPDATE and INSERT triggers.
TG_LEVEL: The trigger level (ROW or STATEMENT), indicating whether the trigger is row-level or statement-level.
TG_RELID: The object ID of the table on which the trigger is being fired.
TG_TABLE_NAME: The name of the table on which the trigger is being fired.
TG_TABLE_SCHEMA: The schema of the table on which the trigger is being fired.
TG_ARGV: An array of string arguments provided when creating the trigger.
TG_NARGS: The number of arguments in the TG_ARGV array.
Types of triggers#
There are two types of trigger, BEFORE and AFTER:

Trigger before changes are made#
Executes before the triggering event.

create trigger before_insert_trigger
before insert on orders
for each row
execute function before_insert_function();

Trigger after changes are made#
Executes after the triggering event.

create trigger after_delete_trigger
after delete on customers
for each row
execute function after_delete_function();

Execution frequency#
There are two options available for executing triggers:

for each row: specifies that the trigger function should be executed once for each affected row.
for each statement: the trigger is executed once for the entire operation (for example, once on insert). This can be more efficient than for each row when dealing with multiple rows affected by a single SQL statement, as they allow you to perform calculations or updates on groups of rows at once.
Dropping a trigger#
You can delete a trigger using the drop trigger command:

drop trigger "trigger_name" on "table_name";

Resources#
Official Postgres Docs: Triggers
Official Postgres Docs: Overview of Trigger Behavior
Official Postgres Docs: CREATE TRIGGER

Working With Arrays
PostgreSQL supports flexible array types. These arrays are also supported in the Supabase Dashboard and in the JavaScript API.

Create a table with an array column#
Create a test table with a text array (an array of strings):


Dashboard

SQL
Go to the Table editor page in the Dashboard.
Click New Table and create a table with the name arraytest.
Click Save.
Click New Column and create a column with the name textarray, type text, and select Define as array.
Click Save.
Insert a record with an array value#

Dashboard

SQL

JavaScript

Dart

Swift

Kotlin

Python
Go to the Table editor page in the Dashboard.
Select the arraytest table.
Click Insert row and add ["Harry", "Larry", "Moe"].
Click Save.
View the results#

Dashboard

SQL
Go to the Table editor page in the Dashboard.
Select the arraytest table.
You should see:

id	textarray
1	["Harry","Larry","Moe"]
Query array data#
PostgreSQL uses 1-based indexing (e.g., textarray[1] is the first item in the array).


SQL

JavaScript

Swift
To select the first item from the array and get the total length of the array:

SELECT textarray[1], array_length(textarray, 1) FROM arraytest;

returns:

textarray	array_length
Harry	3

Managing Indexes in PostgreSQL
An index makes your Postgres queries faster. The index is like a "table of contents" for your data - a reference list which allows queries to quickly locate a row in a given table without needing to scan the entire table (which in large tables can take a long time).

Indexes can be structured in a few different ways. The type of index chosen depends on the values you are indexing. By far the most common index type, and the default in Postgres, is the B-Tree. A B-Tree is the generalized form of a binary search tree, where nodes can have more than two children.

Even though indexes improve query performance, the Postgres query planner may not always make use of a given index when choosing which optimizations to make. Additionally indexes come with some overhead - additional writes and increased storage - so it's useful to understand how and when to use indexes, if at all.

Create an index#
Let's take an example table:

create table persons (
  id bigint generated by default as identity primary key,
  age int,
  height int,
  weight int,
  name text,
  deceased boolean
);

All the queries in this guide can be run using the SQL Editor in the Supabase Dashboard, or via psql if you're connecting directly to the database.

We might want to frequently query users based on their age:

select name from persons where age = 32;

Without an index, Postgres will scan every row in the table to find equality matches on age.

You can verify this by doing an explain on the query:

explain select name from persons where age = 32;

Outputs:

Seq Scan on persons  (cost=0.00..22.75 rows=x width=y)
Filter: (age = 32)

To add a simple B-Tree index you can run:

create index idx_persons_age on persons (age);

It can take a long time to build indexes on large datasets and the default behaviour of create index is to lock the table from writes.

Luckily Postgres provides us with create index concurrently which prevents blocking writes on the table, but does take a bit longer to build.

Here is a simplified diagram of the index we just created (note that in practice, nodes actually have more than two children).

B-Tree index example in Postgres

You can see that in any large data set, traversing the index to locate a given value can be done in much less operations (O(log n)) than compared to scanning the table one value at a time from top to bottom (O(n)).

Partial indexes#
If you are frequently querying a subset of rows then it may be more efficient to build a partial index. In our example, perhaps we only want to match on age where deceased is false. We could build a partial index:

create index idx_living_persons_age on persons (age)
where deceased is false;

Ordering indexes#
By default B-Tree indexes are sorted in ascending order, but sometimes you may want to provide a different ordering. Perhaps our application has a page featuring the top 10 oldest people. Here we would want to sort in descending order, and include NULL values last. For this we can use:

create index idx_persons_age_desc on persons (age desc nulls last);

Reindexing#
After a while indexes can become stale and may need rebuilding. Postgres provides a reindex command for this, but due to Postgres locks being placed on the index during this process, you may want to make use of the concurrent keyword.

reindex index concurrently idx_persons_age;

Alternatively you can reindex all indexes on a particular table:

reindex table concurrently persons;

Take note that reindex can be used inside a transaction, but reindex [index/table] concurrently cannot.

Index Advisor#
Indexes can improve query performance of your tables as they grow. The Supabase Dashboard offers an Index Advisor, which suggests potential indexes to add to your tables.

For more information on the Index Advisor and its suggestions, see the index_advisor extension.

To use the Dashboard Index Advisor:

Go to the Query Performance page.
Click on a query to bring up the Details side panel.
Select the Indexes tab.
Enable Index Advisor if prompted.
Understanding Index Advisor results#
The Indexes tab shows the existing indexes used in the selected query. Note that indexes suggested in the "New Index Recommendations" section may not be used when you create them. Postgres' query planner may intentionally ignore an available index if it determines that the query will be faster without. For example, on a small table, a sequential scan might be faster than an index scan. In that case, the planner will switch to using the index as the table size grows, helping to future proof the query.

If additional indexes might improve your query, the Index Advisor shows the suggested indexes with the estimated improvement in startup and total costs:

Startup cost is the cost to fetch the first row
Total cost is the cost to fetch all the rows
Costs are in arbitrary units, where a single sequential page read costs 1.0 units.

Querying Joins and Nested tables
The data APIs automatically detect relationships between Postgres tables. Since Postgres is a relational database, this is a very common scenario.

One-to-many joins#
Let's use an example database that stores countries and cities:


Tables

SQL
Countries

id	name
1	United Kingdom
2	United States
Cities

id	name	country_id
1	London	1
2	Manchester	1
3	Los Angeles	2
4	New York	2
The APIs will automatically detect relationships based on the foreign keys:


JavaScript

Dart

Swift

Kotlin

Python

GraphQL

URL
const { data, error } = await supabase.from('countries').select(`
  id, 
  name, 
  cities ( id, name )
`)

TypeScript types for joins#
supabase-js always returns a data object (for success), and an error object (for unsuccessful requests).

These helper types provide the result types from any query, including nested types for database joins.

Given the following schema with a relation between cities and countries:

create table countries (
  "id" serial primary key,
  "name" text
);

create table cities (
  "id" serial primary key,
  "name" text,
  "country_id" int references "countries"
);

We can get the nested CountriesWithCities type like this:

import { QueryResult, QueryData, QueryError } from '@supabase/supabase-js'

const countriesWithCitiesQuery = supabase.from('countries').select(`
  id,
  name,
  cities (
    id,
    name
  )
`)
type CountriesWithCities = QueryData<typeof countriesWithCitiesQuery>

const { data, error } = await countriesWithCitiesQuery
if (error) throw error
const countriesWithCities: CountriesWithCities = data

Many-to-many joins#
The data APIs will detect many-to-many joins. For example, if you have a database which stored teams of users (where each user could belong to many teams):

create table users (
  "id" serial primary key,
  "name" text
);

create table teams (
  "id" serial primary key,
  "team_name" text
);

create table members (
  "user_id" int references users,
  "team_id" int references teams,
  primary key (user_id, team_id)
);

In these cases you don't need to explicitly define the joining table (members). If we wanted to fetch all the teams and the members in each team:


JavaScript

Dart

Swift

Kotlin

Python

GraphQL

URL
const { data, error } = await supabase.from('teams').select(`
  id, 
  team_name, 
  users ( id, name )
`)

Specifying the ON clause for joins with multiple foreign keys#
For example, if you have a project that tracks when employees check in and out of work shifts:

-- Employees
create table users (
  "id" serial primary key,
  "name" text
);

-- Badge scans
create table scans (
  "id" serial primary key,
  "user_id" int references users,
  "badge_scan_time" timestamp
);

-- Work shifts
create table shifts (
  "id" serial primary key,
  "user_id" int references users,
  "scan_id_start" int references scans, -- clocking in
  "scan_id_end" int references scans, -- clocking out
  "attendance_status" text
);

In this case, you need to explicitly define the join because the joining column on shifts is ambiguous as they are both referencing the scans table.

To fetch all the shifts with scan_id_start and scan_id_end related to a specific scan, use the following syntax:


JavaScript

Dart

Swift

Kotlin

Python

GraphQL
const { data, error } = await supabase.from('shifts').select(
  `
    *,
    start_scan:scans!scan_id_start (
      id,
      user_id,
      badge_scan_time
    ),
   end_scan:scans!scan_id_end (
     id, 
     user_id,
     badge_scan_time
    )
  `
)

Edit this page on GitHub

Managing JSON and unstructured data
Using the JSON data type in Postgres.
Postgres supports storing and querying unstructured data.

JSON vs JSONB#
Postgres supports two types of JSON columns: json (stored as a string) and jsonb (stored as a binary). The recommended type is jsonb for almost all cases.

json stores an exact copy of the input text. Database functions must reparse the content on each execution.
jsonb stores database in a decomposed binary format. While this makes it slightly slower to input due to added conversion overhead, it is significantly faster to process, since no reparsing is needed.
When to use JSON/JSONB#
Generally you should use a jsonb column when you have data that is unstructured or has a variable schema. For example, if you wanted to store responses for various webhooks, you might not know the format of the response when creating the table. Instead, you could store the payload as a jsonb object in a single column.

Don't go overboard with json/jsonb columns. They are a useful tool, but most of the benefits of a relational database come from the ability to query and join structured data, and the referential integrity that brings.

Create JSONB columns#
json/jsonb is just another "data type" for Postgres columns. You can create a jsonb column in the same way you would create a text or int column:


SQL

Dashboard
create table books (
  id serial primary key,
  title text,
  author text,
  metadata jsonb
);

Inserting JSON data#
You can insert JSON data in the same way that you insert any other data. The data must be valid JSON.


SQL

Dashboard

JavaScript

Dart

Swift

Kotlin

Python
insert into books
  (title, author, metadata)
values
  (
    'The Poky Little Puppy',
    'Janette Sebring Lowrey',
    '{"description":"Puppy is slower than other, bigger animals.","price":5.95,"ages":[3,6]}'
  ),
  (
    'The Tale of Peter Rabbit',
    'Beatrix Potter',
    '{"description":"Rabbit eats some vegetables.","price":4.49,"ages":[2,5]}'
  ),
  (
    'Tootle',
    'Gertrude Crampton',
    '{"description":"Little toy train has big dreams.","price":3.99,"ages":[2,5]}'
  ),
  (
    'Green Eggs and Ham',
    'Dr. Seuss',
    '{"description":"Sam has changing food preferences and eats unusually colored food.","price":7.49,"ages":[4,8]}'
  ),
  (
    'Harry Potter and the Goblet of Fire',
    'J.K. Rowling',
    '{"description":"Fourth year of school starts, big drama ensues.","price":24.95,"ages":[10,99]}'
  );

Query JSON data#
Querying JSON data is similar to querying other data, with a few other features to access nested values.

Postgres support a range of JSON functions and operators. For example, the -> operator returns values as jsonb data. If you want the data returned as text, use the ->> operator.


SQL

JavaScript

Swift

Kotlin

Python

Result
select
  title,
  metadata ->> 'description' as description, -- returned as text
  metadata -> 'price' as price,
  metadata -> 'ages' -> 0 as low_age,
  metadata -> 'ages' -> 1 as high_age
from books;

Validating JSON data#
Supabase provides the pg_jsonschema extension that adds the ability to validate json and jsonb data types against JSON Schema documents.

Once you have enabled the extension, you can add a "check constraint" to your table to validate the JSON data:

create table customers (
  id serial primary key,
  metadata json
);

alter table customers
add constraint check_metadata check (
  json_matches_schema(
    '{
        "type": "object",
        "properties": {
            "tags": {
                "type": "array",
                "items": {
                    "type": "string",
                    "maxLength": 16
                }
            }
        }
    }',
    metadata
  )
);

Resources#
Postgres: JSON Functions and Operators
Postgres JSON types
Edit this page on GitHub

Debugging and monitoring
The Supabase CLI comes with a range of tools to help inspect your Postgres instances for potential issues. The CLI gets the information from Postgres internals. Therefore, most tools provided are compatible with any Postgres databases regardless if they are a Supabase project or not.

You can find installation instructions for the the Supabase CLI here.

The inspect db command#
The inspection tools for your Postgres database are under then inspect db command. You can get a full list of available commands by running supabase inspect db help.

$ supabase inspect db help
Tools to inspect your Supabase database

Usage:
  supabase inspect db [command]

Available Commands:
  bloat                Estimates space allocated to a relation that is full of dead tuples
  blocking             Show queries that are holding locks and the queries that are waiting for them to be released
  cache-hit            Show cache hit rates for tables and indices

...

Connect to any Postgres database#
Most inspection commands are Postgres agnostic. You can run inspection routines on any Postgres database even if it is not a Supabase project by providing a connection string via --db-url.

For example you can connect to your local Postgres instance:

supabase --db-url postgresql://postgres:postgres@localhost:5432/postgres inspect db bloat

Connect to a Supabase instance#
Working with Supabase, you can link the Supabase CLI with your project:

supabase link --project-ref <project-id>

Then the CLI will automatically connect to your Supabase project whenever you are in the project folder and you no longer need to provide —db-url.

Inspection commands#
Below are the db inspection commands provided, grouped by different use cases.

Some commands might require pg_stat_statements to be enabled or a specific Postgres version to be used.

Disk storage#
These commands are handy if you are running low on disk storage:

bloat - estimates the amount of wasted space
vacuum-stats - gives information on waste collection routines
table-record-counts - estimates the number of records per table
table-sizes - shows the sizes of tables
index-sizes - shows the sizes of individual index
table-index-sizes - shows the sizes of indexes for each table
Query performance#
The commands below are useful if your Postgres database consumes a lot of resources like CPU, RAM or Disk IO. You can also use them to investigate slow queries.

cache-hit - shows how efficient your cache usage is overall
unused-indexes - shows indexes with low index scans
index-usage - shows information about the efficiency of indexes
seq-scans - show number of sequential scans recorded against all tables
long-running-queries - shows long running queries that are executing right now
outliers - shows queries with high execution time but low call count and queries with high proportion of execution time spent on synchronous I/O
Locks#
locks - shows statements which have taken out an exclusive lock on a relation
blocking - shows statements that are waiting for locks to be released
Connections#
role-connections - shows number of active connections for all database roles (Supabase-specific command)
replication-slots - shows information about replication slots on the database
Notes on pg_stat_statements#
Following commands require pg_stat_statements to be enabled: calls, locks, cache-hit, blocking, unused-indexes, index-usage, bloat, outliers, table-record-counts, replication-slots, seq-scans, vacuum-stats, long-running-queries.

When using pg_stat_statements also take note that it only stores the latest 5,000 statements. Moreover, consider resetting the analysis after optimizing any queries by running select pg_stat_statements_reset();

Learn more about pg_stats here.

Acknowledgements#
Supabase CLI's inspect commands are heavily inspired by the pg-extras tools.

Edit this page on GitHub

Debugging performance issues
Debug slow-running queries using the Postgres execution planner.
explain() is a method that provides the Postgres EXPLAIN execution plan of a query. It is a powerful tool for debugging slow queries and understanding how Postgres will execute a given query. This feature is applicable to any query, including those made through rpc() or write operations.

Enabling explain()#
explain() is disabled by default to protect sensitive information about your database structure and operations. We recommend using explain() in a non-production environment. Run the following SQL to enable explain():

-- enable explain
alter role authenticator 
set pgrst.db_plan_enabled to 'true';

-- reload the config
notify pgrst, 'reload config';

Using explain()#
To get the execution plan of a query, you can chain the explain() method to a Supabase query:

const { data, error } = await supabase
  .from('countries')
  .select()
  .explain()

Example data#
To illustrate, consider the following setup of a countries table:

create table countries (
  id int8 primary key,
  name text
);

insert into countries
  (id, name)
values
  (1, 'Afghanistan'),
  (2, 'Albania'),
  (3, 'Algeria');

Expected response#
The response would typically look like this:

Aggregate  (cost=33.34..33.36 rows=1 width=112)
  ->  Limit  (cost=0.00..18.33 rows=1000 width=40)
        ->  Seq Scan on countries  (cost=0.00..22.00 rows=1200 width=40)

By default, the execution plan is returned in TEXT format. However, you can also retrieve it as JSON by specifying the format parameter.

Production use with pre-request protection#
If you need to enable explain() in a production environment, ensure you protect your database by restricting access to the explain() feature. You can do so by using a pre-request function that filters requests based on the IP address:

create or replace function filter_plan_requests()
returns void as $$
declare
  headers   json := current_setting('request.headers', true)::json;
  client_ip text := coalesce(headers->>'cf-connecting-ip', '');
  accept    text := coalesce(headers->>'accept', '');
  your_ip   text := '123.123.123.123'; -- replace this with your IP
begin
  if accept like 'application/vnd.pgrst.plan%' and client_ip != your_ip then
    raise insufficient_privilege using
      message = 'Not allowed to use application/vnd.pgrst.plan';
  end if;
end; $$ language plpgsql;
alter role authenticator set pgrst.db_pre_request to 'filter_plan_requests';
notify pgrst, 'reload config';

Replace '123.123.123.123' with your actual IP address.

Disabling explain#
To disable the explain() method after use, execute the following SQL commands:

-- disable explain
alter role authenticator 
set pgrst.db_plan_enabled to 'false';

-- if you used the above pre-request
alter role authenticator 
set pgrst.db_pre_request to '';

-- reload the config
notify pgrst, 'reload config';

Edit this page on GitHub
Is this helpful?

Yes

No
On this page
Enabling explain()
Using explain()
Example data
Expected response
Production use with pre-request protection
Disabling explain
Need some help?

Contact support
