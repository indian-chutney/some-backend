-- SQL functions for leaderboard aggregation
-- These should be executed in the Supabase database to enable full SQL aggregation

-- Function for team leaderboard
CREATE OR REPLACE FUNCTION get_team_leaderboard(start_date DATE, end_date DATE)
RETURNS TABLE(team_name TEXT, team_score BIGINT)
LANGUAGE sql
AS $$
  SELECT 
    t.team_name,
    COALESCE(SUM(uts.tasks_done), 0) as team_score
  FROM teams t
  LEFT JOIN users u ON t.id = u.team_id
  LEFT JOIN user_task_stats uts ON u.user_id = uts.user_id 
    AND uts.date >= start_date 
    AND uts.date <= end_date
  WHERE t.team_name IS NOT NULL
  GROUP BY t.id, t.team_name
  ORDER BY team_score DESC;
$$;

-- Function for individual leaderboard  
CREATE OR REPLACE FUNCTION get_individual_leaderboard(start_date DATE, end_date DATE)
RETURNS TABLE(username TEXT, user_score BIGINT)
LANGUAGE sql
AS $$
  SELECT 
    u.username,
    COALESCE(SUM(uts.tasks_done), 0) as user_score
  FROM users u
  LEFT JOIN user_task_stats uts ON u.user_id = uts.user_id 
    AND uts.date >= start_date 
    AND uts.date <= end_date
  WHERE u.username IS NOT NULL
  GROUP BY u.user_id, u.username
  ORDER BY user_score DESC;
$$;

-- Function for tasks info aggregation
CREATE OR REPLACE FUNCTION get_user_tasks_info(target_user_id TEXT, 
  today_date DATE, 
  yesterday_date DATE,
  week_start DATE,
  last_week_start DATE, 
  last_week_end DATE,
  month_start DATE,
  last_month_start DATE,
  last_month_end DATE)
RETURNS TABLE(
  todays_tasks INTEGER,
  yesterdays_tasks INTEGER, 
  weeks_tasks INTEGER,
  last_weeks_tasks INTEGER,
  months_tasks INTEGER,
  last_months_tasks INTEGER
)
LANGUAGE sql
AS $$
  SELECT 
    COALESCE((SELECT SUM(tasks_done) FROM user_task_stats WHERE user_id = target_user_id AND date = today_date), 0)::INTEGER as todays_tasks,
    COALESCE((SELECT SUM(tasks_done) FROM user_task_stats WHERE user_id = target_user_id AND date = yesterday_date), 0)::INTEGER as yesterdays_tasks,
    COALESCE((SELECT SUM(tasks_done) FROM user_task_stats WHERE user_id = target_user_id AND date >= week_start AND date <= today_date), 0)::INTEGER as weeks_tasks,
    COALESCE((SELECT SUM(tasks_done) FROM user_task_stats WHERE user_id = target_user_id AND date >= last_week_start AND date <= last_week_end), 0)::INTEGER as last_weeks_tasks,
    COALESCE((SELECT SUM(tasks_done) FROM user_task_stats WHERE user_id = target_user_id AND date >= month_start AND date <= today_date), 0)::INTEGER as months_tasks,
    COALESCE((SELECT SUM(tasks_done) FROM user_task_stats WHERE user_id = target_user_id AND date >= last_month_start AND date <= last_month_end), 0)::INTEGER as last_months_tasks;
$$;

-- Function for user graph data aggregation - week
CREATE OR REPLACE FUNCTION get_user_graph_week(target_user_id TEXT, start_date DATE)
RETURNS TABLE(date DATE, tasks INTEGER)
LANGUAGE sql
AS $$
  WITH date_series AS (
    SELECT generate_series(start_date, start_date + INTERVAL '6 days', INTERVAL '1 day')::DATE as date
  )
  SELECT 
    ds.date,
    COALESCE(uts.tasks_done, 0)::INTEGER as tasks
  FROM date_series ds
  LEFT JOIN user_task_stats uts ON ds.date = uts.date AND uts.user_id = target_user_id
  ORDER BY ds.date;
$$;

-- Function for user graph data aggregation - 30 days (grouped by 2 days)
CREATE OR REPLACE FUNCTION get_user_graph_30days(target_user_id TEXT, start_date DATE)
RETURNS TABLE(date DATE, tasks INTEGER)
LANGUAGE sql  
AS $$
  WITH date_series AS (
    SELECT generate_series(start_date, start_date + INTERVAL '29 days', INTERVAL '2 days')::DATE as period_start
  ),
  aggregated AS (
    SELECT 
      ds.period_start,
      ds.period_start + INTERVAL '1 day' as period_end,
      COALESCE(SUM(uts.tasks_done), 0)::INTEGER as tasks
    FROM date_series ds
    LEFT JOIN user_task_stats uts ON uts.date >= ds.period_start 
      AND uts.date <= ds.period_start + INTERVAL '1 day'
      AND uts.user_id = target_user_id
    GROUP BY ds.period_start
  )
  SELECT period_end as date, tasks FROM aggregated ORDER BY period_end;
$$;

-- Function for user graph data aggregation - all time (grouped by month)
CREATE OR REPLACE FUNCTION get_user_graph_all_time(target_user_id TEXT)
RETURNS TABLE(month TEXT, tasks INTEGER)
LANGUAGE sql
AS $$
  SELECT 
    TO_CHAR(DATE_TRUNC('month', uts.date), 'YYYY-MM') as month,
    SUM(uts.tasks_done)::INTEGER as tasks
  FROM user_task_stats uts
  WHERE uts.user_id = target_user_id
  GROUP BY DATE_TRUNC('month', uts.date)
  ORDER BY DATE_TRUNC('month', uts.date);
$$;