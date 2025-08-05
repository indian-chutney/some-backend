import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenvx from "@dotenvx/dotenvx";
import cors from "cors";
import { authenticate } from "./middleware.js";
import { type Database } from "./types/supabase.js";
import axios from "axios";
import qs from "querystring";
import { decodeJwt } from "jose";

dotenvx.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string,
);

const app = express();
app.use(express.json());
app.use(cors());

app.get(
  "/api/v1/auth/redirect",
  async (req: express.Request, res: express.Response) => {
    console.log("request hit");
    const code = req.query.code;

    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    console.log(tokenEndpoint);

    const payload = {
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://localhost:3000/api/v1/auth/redirect",
    };

    try {
      const response = await axios.post(
        tokenEndpoint,
        qs.stringify(payload as any),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );

      const { id_token } = response.data;
      const user = decodeJwt(id_token);

      const { data } = await supabase
        .from("users")
        .select()
        .eq("user_id", user.oid)
        .maybeSingle();

      const exists = !!data;

      if (exists) {
        const url = `http://localhost:5173/auth/success?id_token=${encodeURIComponent(id_token)}&exists=true`;

        return res.redirect(url);
      }

      // Insert user if not exists
      await supabase
        .from("users")
        .insert({ user_id: user.oid, username: user.name });
      const url = `http://localhost:5173/auth/success?id_token=${encodeURIComponent(id_token)}&exists=false`;

      return res.redirect(url);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Token error:", error.response?.data || error.message);
        res.status(500).send("Authentication failed");
      } else {
        console.error("Unexpected error:", error);
        res.status(500).send("Unexpected error");
      }
    }
  },
);
app.use(authenticate);

app.post(
  "/api/v1/role",
  async (req: express.Request, res: express.Response) => {
    const role = (req as any).body.role;
    try {
      await supabase.from("users").update({ role: role });
      res.json({
        message: "role updated",
      });
    } catch (err) {
      console.error("Database error: ", err);
      res.status(500).send("Database error");
    }
    return;
  },
);

app.get(
  "/api/v1/health-bar",
  (req: express.Request, res: express.Response) => {},
);

app.get(
  "/api/v1/avatar-info",
  (req: express.Request, res: express.Response) => {
    return;
  },
);

app.post(
  "/api/v1/avatar-info",
  (req: express.Request, res: express.Response) => {
    const avatar_data = req.body.avatar_data;
  },
);

// Cache for leaderboard data (1 minute expiry)
const leaderboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

app.get("/api/v1/user-info", async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).payload.oid;
    
    const { data, error } = await supabase
      .from("users")
      .select("username, role")
      .eq("user_id", userId)
      .single();
    
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }
    
    res.json({ username: data.username, role: data.role });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/v1/tasks-info", async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).payload.oid;
    const now = new Date();
    
    // Get today's date in YYYY-MM-DD format
    const today = now.toISOString().split('T')[0]!;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    
    // Get start of current week (Monday)
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
    const weekStart = currentWeekStart.toISOString().split('T')[0]!;
    
    // Get start of last week
    const lastWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    const lastWeekEnd = new Date(currentWeekStart.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    
    // Get start of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
    
    // Get start of last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = lastMonth.toISOString().split('T')[0]!;
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]!;
    
    // Query for today's tasks
    const { data: todayData } = await supabase
      .from("user_task_stats")
      .select("tasks_done")
      .eq("user_id", userId)
      .eq("date", today)
      .single();
    
    // Query for yesterday's tasks
    const { data: yesterdayData } = await supabase
      .from("user_task_stats")
      .select("tasks_done")
      .eq("user_id", userId)
      .eq("date", yesterday)
      .single();
    
    // Query for current week's tasks
    const { data: weekData } = await supabase
      .from("user_task_stats")
      .select("tasks_done")
      .eq("user_id", userId)
      .gte("date", weekStart)
      .lte("date", today);
    
    // Query for last week's tasks
    const { data: lastWeekData } = await supabase
      .from("user_task_stats")
      .select("tasks_done")
      .eq("user_id", userId)
      .gte("date", lastWeekStart)
      .lte("date", lastWeekEnd);
    
    // Query for current month's tasks
    const { data: monthData } = await supabase
      .from("user_task_stats")
      .select("tasks_done")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", today);
    
    // Query for last month's tasks
    const { data: lastMonthData } = await supabase
      .from("user_task_stats")
      .select("tasks_done")
      .eq("user_id", userId)
      .gte("date", lastMonthStart)
      .lte("date", lastMonthEnd);
    
    // Calculate totals
    const todays_tasks = todayData?.tasks_done || 0;
    const yesterdays_tasks = yesterdayData?.tasks_done || 0;
    const weeks_tasks = weekData?.reduce((sum, item) => sum + item.tasks_done, 0) || 0;
    const last_weeks_tasks = lastWeekData?.reduce((sum, item) => sum + item.tasks_done, 0) || 0;
    const months_tasks = monthData?.reduce((sum, item) => sum + item.tasks_done, 0) || 0;
    const last_months_tasks = lastMonthData?.reduce((sum, item) => sum + item.tasks_done, 0) || 0;
    
    // Calculate progress percentages (set to 0 if negative)
    const progress = yesterdays_tasks > 0 
      ? Math.max(0, ((todays_tasks - yesterdays_tasks) / yesterdays_tasks) * 100)
      : 0;
    
    const weeks_progress = last_weeks_tasks > 0
      ? Math.max(0, ((weeks_tasks - last_weeks_tasks) / last_weeks_tasks) * 100)
      : 0;
    
    const months_progress = last_months_tasks > 0
      ? Math.max(0, ((months_tasks - last_months_tasks) / last_months_tasks) * 100)
      : 0;
    
    res.json({
      todays_tasks,
      progress,
      weeks_tasks,
      weeks_progress,
      months_tasks,
      months_progress
    });
    
  } catch (error) {
    console.error("Error fetching tasks info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/v1/leaderboard", async (req: express.Request, res: express.Response) => {
  try {
    const { data, type } = req.query;
    const dataParam = data as string || 'today';
    const typeParam = type as string || 'individual';
    
    // Create cache key
    const cacheKey = `${dataParam}-${typeParam}`;
    
    // Check cache
    const cached = leaderboardCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return res.json(cached.data);
    }
    
    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString().split('T')[0]!;
    
    // Calculate date range based on data parameter
    switch (dataParam) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekStart = new Date(now);
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        weekStart.setDate(weekStart.getDate() - daysToMonday);
        startDate = weekStart.toISOString().split('T')[0]!;
        break;
      case 'this month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
        break;
      case 'all_time':
        startDate = '1900-01-01'; // Very old date to get all data
        break;
      default:
        startDate = endDate; // Default to today
    }
    
    if (typeParam === 'team') {
      // Query for team leaderboard
      const { data: teamStats } = await supabase
        .from("user_task_stats")
        .select(`
          user_id,
          tasks_done,
          users!inner(team_id, teams!inner(team_name))
        `)
        .gte("date", startDate)
        .lte("date", endDate);
      
      // Aggregate by team
      const teamScores = new Map<string, number>();
      teamStats?.forEach((stat: any) => {
        const teamName = stat.users?.teams?.team_name;
        if (teamName) {
          teamScores.set(teamName, (teamScores.get(teamName) || 0) + stat.tasks_done);
        }
      });
      
      const teams = Array.from(teamScores.entries())
        .map(([team_name, team_score]) => ({ team_name, team_score }))
        .sort((a, b) => b.team_score - a.team_score);
      
      const result = { teams };
      leaderboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
      res.json(result);
      
    } else {
      // Query for individual leaderboard
      const { data: userStats } = await supabase
        .from("user_task_stats")
        .select(`
          user_id,
          tasks_done,
          users!inner(username)
        `)
        .gte("date", startDate)
        .lte("date", endDate);
      
      // Aggregate by user
      const userScores = new Map<string, { username: string; score: number }>();
      userStats?.forEach((stat: any) => {
        const username = stat.users?.username;
        const userId = stat.user_id;
        if (username) {
          const existing = userScores.get(userId) || { username, score: 0 };
          userScores.set(userId, { username, score: existing.score + stat.tasks_done });
        }
      });
      
      const individuals = Array.from(userScores.values())
        .map(({ username, score }) => ({ username, user_score: score }))
        .sort((a, b) => b.user_score - a.user_score);
      
      const result = { individuals };
      leaderboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
      res.json(result);
    }
    
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/v1/user-graph", async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).payload.oid;
    const { data } = req.query;
    const dataParam = data as string || 'week';
    
    const now = new Date();
    let user_data: Array<{ date?: string; month?: string; tasks: number }> = [];
    
    if (dataParam === 'week') {
      // Get last 7 days of data
      const weekData: Array<{ date: string; tasks: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0]!;
        
        const { data: dayData } = await supabase
          .from("user_task_stats")
          .select("tasks_done")
          .eq("user_id", userId)
          .eq("date", dateStr)
          .single();
        
        weekData.push({ date: dateStr, tasks: dayData?.tasks_done || 0 });
      }
      user_data = weekData;
      
    } else if (dataParam === '30days') {
      // Get last 30 days, grouped every 2 days
      const thirtyDaysData: Array<{ date: string; tasks: number }> = [];
      for (let i = 29; i >= 0; i -= 2) {
        const endDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const startDate = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
        
        const endDateStr = endDate.toISOString().split('T')[0]!;
        const startDateStr = startDate.toISOString().split('T')[0]!;
        
        const { data: periodData } = await supabase
          .from("user_task_stats")
          .select("tasks_done")
          .eq("user_id", userId)
          .gte("date", startDateStr)
          .lte("date", endDateStr);
        
        const totalTasks = periodData?.reduce((sum, item) => sum + item.tasks_done, 0) || 0;
        thirtyDaysData.push({ date: endDateStr, tasks: totalTasks });
      }
      user_data = thirtyDaysData;
      
    } else if (dataParam === 'all_time') {
      // Get monthly data since first task
      const { data: firstTaskData } = await supabase
        .from("user_task_stats")
        .select("date")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .limit(1)
        .single();
      
      if (firstTaskData) {
        const firstDate = new Date(firstTaskData.date);
        const monthlyData: Array<{ month: string; tasks: number }> = [];
        
        // Iterate through months from first task to now
        const current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
        const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        while (current <= nowMonth) {
          const monthStart = current.toISOString().split('T')[0]!;
          const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().split('T')[0]!;
          const monthStr = current.toISOString().substring(0, 7); // YYYY-MM format
          
          const { data: monthData } = await supabase
            .from("user_task_stats")
            .select("tasks_done")
            .eq("user_id", userId)
            .gte("date", monthStart)
            .lte("date", monthEnd);
          
          const totalTasks = monthData?.reduce((sum, item) => sum + item.tasks_done, 0) || 0;
          monthlyData.push({ month: monthStr, tasks: totalTasks });
          
          current.setMonth(current.getMonth() + 1);
        }
        user_data = monthlyData;
      }
    }
    
    res.json({ user_data });
    
  } catch (error) {
    console.error("Error fetching user graph data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("listening on port 3000");
});
