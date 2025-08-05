# PostgreSQL Aggregation Refactor

This document describes the changes made to refactor the `/leaderboard`, `/tasks-info`, and `/user-graph` endpoints to use PostgreSQL aggregations instead of JavaScript.

## Changes Made

### 1. `/api/v1/leaderboard` Endpoint

**Before:** Used JavaScript `Map` and `reduce()` operations to aggregate team and individual scores after fetching raw data from the database.

**After:** 
- **Primary approach:** Uses PostgreSQL RPC functions `get_team_leaderboard()` and `get_individual_leaderboard()` for complete SQL aggregation with `GROUP BY`, `SUM()`, and `ORDER BY`.
- **Fallback approach:** Optimized Supabase queries that use PostgreSQL joins and filtering, with minimal JavaScript only for final grouping.

### 2. `/api/v1/tasks-info` Endpoint  

**Before:** Made multiple separate queries and used JavaScript `reduce()` to sum task counts.

**After:**
- **Primary approach:** Uses PostgreSQL RPC function `get_user_tasks_info()` that performs all aggregations in a single SQL call.
- **Fallback approach:** Uses Supabase's `.sum()` aggregation function to let PostgreSQL calculate totals instead of fetching raw data and summing in JavaScript.

### 3. `/api/v1/user-graph` Endpoint

**Before:** Used loops with individual queries and JavaScript aggregation for different time periods.

**After:**
- **Primary approach:** Uses PostgreSQL RPC functions:
  - `get_user_graph_week()` - Daily data for 7 days
  - `get_user_graph_30days()` - 2-day aggregated periods for 30 days
  - `get_user_graph_all_time()` - Monthly aggregation since first task
- **Fallback approach:** Uses `Promise.all()` with PostgreSQL `.sum()` aggregation for parallel queries instead of sequential loops.

## SQL Functions

To enable full PostgreSQL aggregation, execute the SQL functions in `/sql/leaderboard_functions.sql` in your Supabase database. These functions provide:

1. **Complete SQL aggregation** - All grouping, summing, and sorting happens in PostgreSQL
2. **Optimized performance** - Single queries instead of multiple round trips
3. **Proper date handling** - Uses PostgreSQL date functions and series generation
4. **Consistent results** - Handles edge cases like missing data with `COALESCE()`

### Setup Instructions

1. Connect to your Supabase database
2. Execute the SQL functions from `sql/leaderboard_functions.sql`
3. The endpoints will automatically use these functions when available
4. If functions are not available, endpoints fall back to optimized Supabase queries

## Benefits

1. **Reduced Data Transfer:** Only aggregated results are sent from database to application
2. **Better Performance:** PostgreSQL handles aggregation more efficiently than JavaScript
3. **Lower Memory Usage:** No need to load large datasets into application memory
4. **Scalability:** Performance remains consistent as data grows
5. **Maintainability:** SQL aggregation logic is centralized in database functions

## Backward Compatibility

- All endpoints maintain the exact same API response format
- Fallback mechanisms ensure functionality even without SQL functions
- No breaking changes to client applications