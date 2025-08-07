import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenvx from "@dotenvx/dotenvx";
import cors from "cors";
import { authenticate } from "./middleware.js";
import { type Database } from "./types/supabase.js";
import axios from "axios";
import qs from "querystring";
import { decodeJwt } from "jose";
import { formatLocalDate } from "./utils/date.js";

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

      console.log(response);

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
  "/api/v1/thanos-hp",
  async (req: express.Request, res: express.Response) => {
    try {
      const { data, error } = await supabase.rpc("get_total_tasks_today");

      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Database error" });
      }

      const totalTasksDone = data ?? 0;

      return res.json({
        hp: 7000 - totalTasksDone,
        total_hp: 7000,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      return res.status(500).json({ error: "Unexpected server error" });
    }
  },
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

const leaderboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

app.get(
  "/api/v1/user-info",
  async (req: express.Request, res: express.Response) => {
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
  },
);

app.get(
  "/api/v1/tasks-info",
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).payload.oid;
      const now = new Date();

      const today = formatLocalDate(now);
      const yesterday = formatLocalDate(
        new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      );

      const currentWeekStart = new Date(now);
      const dayOfWeek = currentWeekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
      const weekStart = formatLocalDate(currentWeekStart);

      const lastWeekStartDate = new Date(
        currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const lastWeekEndDate = new Date(
        currentWeekStart.getTime() - 1 * 24 * 60 * 60 * 1000,
      );
      const lastWeekStart = formatLocalDate(lastWeekStartDate);
      const lastWeekEnd = formatLocalDate(lastWeekEndDate);

      const monthStart = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), 1),
      );
      const lastMonthStart = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
      );
      const lastMonthEnd = formatLocalDate(
        new Date(now.getFullYear(), now.getMonth(), 0),
      );

      const { data: tasksInfo, error } = await supabase.rpc(
        "get_user_tasks_info",
        {
          target_user_id: userId,
          today_date: today,
          yesterday_date: yesterday,
          week_start: weekStart,
          last_week_start: lastWeekStart,
          last_week_end: lastWeekEnd,
          month_start: monthStart,
          last_month_start: lastMonthStart,
          last_month_end: lastMonthEnd,
        },
      );

      if (error || !tasksInfo || tasksInfo.length === 0) {
        console.error("RPC Error:", error);
        return res.status(500).json({ error: "Failed to fetch task stats" });
      }

      const {
        todays_tasks,
        yesterdays_tasks,
        weeks_tasks,
        last_weeks_tasks,
        months_tasks,
        last_months_tasks,
        all_time_tasks,
      } = tasksInfo[0];

      const progress =
        yesterdays_tasks > 0
          ? Math.max(
              0,
              ((todays_tasks - yesterdays_tasks) / yesterdays_tasks) * 100,
            )
          : 0;

      const weeks_progress =
        last_weeks_tasks > 0
          ? Math.max(
              0,
              ((weeks_tasks - last_weeks_tasks) / last_weeks_tasks) * 100,
            )
          : 0;

      const months_progress =
        last_months_tasks > 0
          ? Math.max(
              0,
              ((months_tasks - last_months_tasks) / last_months_tasks) * 100,
            )
          : 0;

      res.json({
        todays_tasks,
        progress,
        weeks_tasks,
        weeks_progress,
        months_tasks,
        months_progress,
        all_time_tasks,
      });
    } catch (err) {
      console.error("Unhandled error in /api/v1/tasks-info:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.get(
  "/api/v1/leaderboard",
  async (req: express.Request, res: express.Response) => {
    try {
      const { data, type } = req.query;
      const dataParam = (data as string) || "today";
      const typeParam = (type as string) || "individual";

      const userId = (req as any).payload.oid as string;

      // Create cache key
      const cacheKey = `${dataParam}-${typeParam}`;

      // Check cache
      const cached = leaderboardCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }

      const now = new Date();
      let startDate: string;
      let endDate: string = formatLocalDate(now);

      // Calculate date range based on data parameter
      switch (dataParam) {
        case "today":
          startDate = endDate;
          break;
        case "week":
          const day = now.getDay(); // 0 (Sun) - 6 (Sat)
          const diff = day === 0 ? -6 : 1 - day; // Adjust to get Monday
          const monday = new Date(now);
          monday.setDate(now.getDate() + diff);
          startDate = formatLocalDate(monday);
          break;
        case "this_month":
          startDate = formatLocalDate(
            new Date(now.getFullYear(), now.getMonth(), 1),
          );
          break;
        case "all_time":
          startDate = "2025-01-01"; // Very old date to get all data
          break;
        default:
          startDate = endDate; // Default to today
      }

      let personalProgress = null;

      if (typeParam === "team") {
        // Try to use SQL RPC function for team leaderboard
        const { data: teams, error } = await supabase.rpc(
          "get_team_leaderboard",
          {
            start_date: startDate,
            end_date: endDate,
          },
        );

        if (userId) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("team_id, teams:team_id(team_name)")
            .eq("user_id", userId)
            .maybeSingle();
          // @ts-ignore
          const userTeamName = userData?.teams.team_name;

          if (userTeamName) {
            const rank = teams.findIndex(
              (t: { team_name: string; team_score: string }) =>
                t.team_name === userTeamName,
            );
            const teamEntry = teams[rank];

            if (rank !== -1 && teamEntry) {
              personalProgress = {
                rank: rank + 1,
                name: userTeamName,
                score: teamEntry.team_score,
                totalParticipants: teams.length,
              };
            }
          }
        }

        if (!error && teams) {
          // Success with SQL aggregation
          const result = { teams };
          leaderboardCache.set(cacheKey, {
            data: { ...result, personal_progress: personalProgress },
            timestamp: Date.now(),
          });

          res.json({ ...result, personal_progress: personalProgress });
        } else {
          // Fallback to optimized Supabase query (still uses PostgreSQL joins and filtering)
          const { data: teamStats } = await supabase
            .from("user_task_stats")
            .select(
              `
            users!inner(teams!inner(team_name)),
            tasks_done
          `,
            )
            .gte("date", startDate)
            .lte("date", endDate)
            .not("users.team_id", "is", null)
            .not("users.teams.team_name", "is", null);

          // Minimal JS aggregation after PostgreSQL filtering/joining
          const teamScores = new Map<string, number>();
          teamStats?.forEach((stat: any) => {
            const teamName = stat.users?.teams?.team_name;
            if (teamName) {
              teamScores.set(
                teamName,
                (teamScores.get(teamName) || 0) + stat.tasks_done,
              );
            }
          });

          const teams = Array.from(teamScores.entries())
            .map(([team_name, team_score]) => ({ team_name, team_score }))
            .sort((a, b) => b.team_score - a.team_score);

          const result = { teams };
          leaderboardCache.set(cacheKey, {
            data: { ...result, personal_progress: personalProgress },
            timestamp: Date.now(),
          });
          res.json({ ...result, personal_progress: personalProgress });
        }
      } else {
        // Try to use SQL RPC function for individual leaderboard
        const { data: individuals, error } = await supabase.rpc(
          "get_individual_leaderboard",
          {
            start_date: startDate,
            end_date: endDate,
          },
        );

        const username = (req as any).payload.name;
        const rank = individuals.findIndex(
          (i: { username: string; user_score: string }) =>
            i.username === username,
        );
        const userEntry = individuals[rank];

        if (rank !== -1 && userEntry) {
          personalProgress = {
            rank: rank + 1,
            name: username,
            score: userEntry.user_score,
            totalParticipants: individuals.length,
          };
        }

        if (!error && individuals) {
          // Success with SQL aggregation
          const result = { individuals };
          leaderboardCache.set(cacheKey, {
            data: { ...result, personal_progress: personalProgress },
            timestamp: Date.now(),
          });

          res.json({ ...result, personal_progress: personalProgress });
        } else {
          // Fallback to optimized Supabase query
          const { data: userStats } = await supabase
            .from("user_task_stats")
            .select(
              `
            user_id,
            users!inner(username),
            tasks_done
          `,
            )
            .gte("date", startDate)
            .lte("date", endDate);

          // Minimal JS aggregation after PostgreSQL filtering/joining
          const userScores = new Map<
            string,
            { username: string; score: number }
          >();
          userStats?.forEach((stat: any) => {
            const username = stat.users?.username;
            const userId = stat.user_id;
            if (username) {
              const existing = userScores.get(userId) || { username, score: 0 };
              userScores.set(userId, {
                username,
                score: existing.score + stat.tasks_done,
              });
            }
          });

          const individuals = Array.from(userScores.values())
            .map(({ username, score }) => ({ username, user_score: score }))
            .sort((a, b) => b.user_score - a.user_score);

          const result = { individuals };
          leaderboardCache.set(cacheKey, {
            data: { ...result, personal_progress: personalProgress },
            timestamp: Date.now(),
          });
          res.json({ ...result, personal_progress: personalProgress });
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.get(
  "/api/v1/user-graph",
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).payload.oid;
      const { data } = req.query;
      const dataParam = (data as string) || "week";

      const now = new Date();

      if (dataParam === "week") {
        // Get last 7 days - try SQL RPC first
        const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const startDate = weekAgo.toISOString().split("T")[0]!;

        const { data: weekData, error } = await supabase.rpc(
          "get_user_graph_week",
          {
            target_user_id: userId,
            start_date: startDate,
          },
        );

        if (!error && weekData) {
          // Success with SQL aggregation
          const user_data = weekData.map((item: any) => ({
            date: item.date,
            tasks: item.tasks,
          }));
          res.json({ user_data });
        } else {
          // Fallback: use individual queries but let PostgreSQL do the work per query
          const user_data: Array<{ date: string; tasks: number }> = [];

          // Generate 7 day queries
          const queries = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split("T")[0]!;
            queries.push(
              supabase
                .from("user_task_stats")
                .select("tasks_done.sum()")
                .eq("user_id", userId)
                .eq("date", dateStr)
                .single()
                .then(({ data }) => ({
                  date: dateStr,
                  tasks: (data as any)?.sum || 0,
                })),
            );
          }

          const results = await Promise.all(queries);
          res.json({ user_data: results });
        }
      } else if (dataParam === "30days") {
        // Get last 30 days, grouped every 2 days - try SQL RPC first
        const thirtyDaysAgo = new Date(
          now.getTime() - 29 * 24 * 60 * 60 * 1000,
        );
        const startDate = thirtyDaysAgo.toISOString().split("T")[0]!;

        const { data: thirtyDaysData, error } = await supabase.rpc(
          "get_user_graph_30days",
          {
            target_user_id: userId,
            start_date: startDate,
          },
        );

        if (!error && thirtyDaysData) {
          // Success with SQL aggregation
          const user_data = thirtyDaysData.map((item: any) => ({
            date: item.date,
            tasks: item.tasks,
          }));
          res.json({ user_data });
        } else {
          // Fallback: Use PostgreSQL SUM for 2-day periods
          const user_data: Array<{ date: string; tasks: number }> = [];
          const queries = [];

          for (let i = 29; i >= 0; i -= 2) {
            const endDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const startDate = new Date(
              now.getTime() - (i + 1) * 24 * 60 * 60 * 1000,
            );

            const endDateStr = endDate.toISOString().split("T")[0]!;
            const startDateStr = startDate.toISOString().split("T")[0]!;

            queries.push(
              supabase
                .from("user_task_stats")
                .select("tasks_done.sum()")
                .eq("user_id", userId)
                .gte("date", startDateStr)
                .lte("date", endDateStr)
                .then(({ data }) => ({
                  date: endDateStr,
                  tasks: (data as any)?.[0]?.sum || 0,
                })),
            );
          }

          const results = await Promise.all(queries);
          res.json({ user_data: results });
        }
      } else if (dataParam === "all_time") {
        // Get monthly data since first task - try SQL RPC first
        const { data: monthlyData, error } = await supabase.rpc(
          "get_user_graph_all_time",
          {
            target_user_id: userId,
          },
        );

        if (!error && monthlyData) {
          // Success with SQL aggregation
          const user_data = monthlyData.map((item: any) => ({
            month: item.month,
            tasks: item.tasks,
          }));
          res.json({ user_data });
        } else {
          // Fallback: Find first task and aggregate by month using PostgreSQL
          const { data: firstTaskData } = await supabase
            .from("user_task_stats")
            .select("date")
            .eq("user_id", userId)
            .order("date", { ascending: true })
            .limit(1)
            .single();

          if (firstTaskData) {
            const firstDate = new Date(firstTaskData.date);
            const user_data: Array<{ month: string; tasks: number }> = [];

            // Generate monthly queries using PostgreSQL date functions
            const current = new Date(
              firstDate.getFullYear(),
              firstDate.getMonth(),
              1,
            );
            const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const queries = [];
            while (current <= nowMonth) {
              const monthStart = current.toISOString().split("T")[0]!;
              const monthEnd = new Date(
                current.getFullYear(),
                current.getMonth() + 1,
                0,
              )
                .toISOString()
                .split("T")[0]!;
              const monthStr = current.toISOString().substring(0, 7); // YYYY-MM format

              queries.push(
                supabase
                  .from("user_task_stats")
                  .select("tasks_done.sum()")
                  .eq("user_id", userId)
                  .gte("date", monthStart)
                  .lte("date", monthEnd)
                  .then(({ data }) => ({
                    month: monthStr,
                    tasks: (data as any)?.[0]?.sum || 0,
                  })),
              );

              current.setMonth(current.getMonth() + 1);
            }

            const results = await Promise.all(queries);
            res.json({ user_data: results });
          } else {
            res.json({ user_data: [] });
          }
        }
      } else {
        res.status(400).json({ error: "Invalid data parameter" });
      }
    } catch (error) {
      console.error("Error fetching user graph data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.listen(3000, () => {
  console.log("listening on port 3000");
});
