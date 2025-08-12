import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenvx from "@dotenvx/dotenvx";
import cors from "cors";
import { authenticate } from "./middleware.js";
import { type Database } from "./types/supabase.js";
import { formatLocalDate } from "./utils/date.js";
import jwt from "jsonwebtoken";

dotenvx.config();

export const supabaseAnon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!, // for auth endpoints like signInWithPassword
);

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER expose to client
);

const app = express();
app.use(express.json());
app.use(cors());

app.post(
  "/api/v1/login",
  async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;

    try {
      const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      const { user } = data!;
      const userId = user!.id;

      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      const role = profile?.role ?? "user";

      const token = jwt.sign(
        {
          userId: userId,
          role: role,
        },
        process.env.JWT_SECRET_KEY!,
      );

      res.json({
        token: token,
      });
    } catch (err) {
      res.status(500).json({ error: "Server error during signin" });
    }
  },
);

app.use(authenticate);

app.get(
  "/api/v1/thanos-hp",
  async (req: express.Request, res: express.Response) => {
    try {
      const { data, error } = await supabaseAdmin.rpc("get_total_emails_today");

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
    return;
  },
);

const leaderboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

app.get(
  "/api/v1/user-info",
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).payload.userId;

      const { data, error } = await supabaseAdmin
        .from("users")
        .select("name, email, team_id")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Database error" });
      }
      //
      const { data: team } = await supabaseAdmin
        .from("teams")
        .select("name")
        .eq("id", data.team_id as string)
        .maybeSingle();
      console.log({ username: data.name, email: data.email, team: team?.name });

      res.json({ username: data.name, email: data.email, team: team?.name });
      return;
    } catch (error) {
      console.error("Error fetching user info:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  },
);

app.get(
  "/api/v1/tasks-info",
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).payload.userId;

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

      const { data: tasksInfo, error } = await supabaseAdmin.rpc(
        "get_emails_stats",
        {
          target_user_id: userId, // uuid
          today_date: today, // 'YYYY-MM-DD'
          yesterday_date: yesterday,
          week_start: weekStart, // Monday date you computed
          last_week_start: lastWeekStart,
          last_week_end: lastWeekEnd,
          month_start: monthStart,
          last_month_start: lastMonthStart,
          last_month_end: lastMonthEnd,
        },
      );

      if (error) throw error;

      const {
        todays_tasks,
        yesterdays_tasks,
        weeks_tasks,
        last_weeks_tasks,
        months_tasks,
        last_months_tasks,
        all_time_tasks,
      } = tasksInfo?.[0] ?? {
        todays_tasks: 0,
        yesterdays_tasks: 0,
        weeks_tasks: 0,
        last_weeks_tasks: 0,
        months_tasks: 0,
        last_months_tasks: 0,
        all_time_tasks: 0,
      };

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
        const { data: teams, error } = await supabaseAdmin.rpc(
          "get_team_leaderboard",
          {
            start_date: startDate,
            end_date: endDate,
            lim: 100,
            off: 0,
          },
        );
        if (error) throw error;

        let personalProgress = null;
        if (userId) {
          const { data: pos } = await supabaseAdmin.rpc(
            "get_team_position_for_user",
            {
              target_user_id: userId,
              start_date: startDate,
              end_date: endDate,
            },
          );
          const p = pos?.[0];
          if (p) {
            personalProgress = {
              rank: p.rank,
              name: p.team_name,
              score: p.team_score,
              totalParticipants: p.total_teams,
            };
          }
        }

        const result = {
          teams: (teams ?? []).map((t) => ({
            team_name: t.team_name ?? "Unknown Team",
            team_score: t.team_score,
            rank: t.rnk,
          })),
        };

        leaderboardCache.set(cacheKey, {
          data: { ...result, personal_progress: personalProgress },
          timestamp: Date.now(),
        });

        return res.json({ ...result, personal_progress: personalProgress });
      } else {
        // Individual leaderboard

        const { data: individuals, error } = await supabaseAdmin.rpc(
          "get_individual_leaderboard",
          { start_date: startDate, end_date: endDate, lim: 100, off: 0 },
        );

        let personalProgress = null;
        if (userId) {
          const { data: me } = await supabaseAdmin.rpc(
            "get_individual_position",
            {
              target_user_id: userId,
              start_date: startDate,
              end_date: endDate,
            },
          );

          const pos = me?.[0];
          if (pos) {
            const username = (req as any).payload.name;
            personalProgress = {
              rank: pos.rank,
              name: username,
              score: pos.user_score,
              totalParticipants: pos.total_participants,
            };
          }
        }

        if (error) throw error;

        const result = {
          individuals: (individuals ?? []).map((i) => ({
            username: i.username ?? "Unknown",
            user_score: i.user_score,
            rank: i.rnk,
          })),
        };

        leaderboardCache.set(cacheKey, {
          data: { ...result, personal_progress: personalProgress },
          timestamp: Date.now(),
        });

        res.json({ ...result, personal_progress: personalProgress });
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
      const userId = (req as any).payload.userId; // keep your current source
      const { data } = req.query;
      const dataParam = (data as string) || "week";

      const now = new Date();

      if (dataParam === "week") {
        const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const startDate = formatLocalDate(weekAgo);

        const { data: weekData, error } = await supabaseAdmin.rpc(
          "get_user_graph_week",
          { target_user_id: userId, start_date: startDate },
        );

        if (error) throw error;

        const user_data = (weekData ?? []).map((item: any) => ({
          date: item.date, // 'YYYY-MM-DD'
          tasks: item.tasks, // number
        }));

        return res.json({ user_data });
      }

      if (dataParam === "30days") {
        const thirtyDaysAgo = new Date(
          now.getTime() - 29 * 24 * 60 * 60 * 1000,
        );
        const startDate = formatLocalDate(thirtyDaysAgo);

        const { data: thirtyDaysData, error } = await supabaseAdmin.rpc(
          "get_user_graph_30days",
          { target_user_id: userId, start_date: startDate },
        );

        if (error) throw error;

        const user_data = (thirtyDaysData ?? []).map((item: any) => ({
          date: item.date, // bucket end date 'YYYY-MM-DD'
          tasks: item.tasks, // number
        }));

        return res.json({ user_data });
      }

      if (dataParam === "all_time") {
        const { data: monthlyData, error } = await supabaseAdmin.rpc(
          "get_user_graph_all_time",
          { target_user_id: userId },
        );

        if (error) throw error;

        const user_data = (monthlyData ?? []).map((item: any) => ({
          month: item.month, // 'YYYY-MM'
          tasks: item.tasks, // number
        }));

        return res.json({ user_data });
      }

      return res.status(400).json({ error: "Invalid data parameter" });
    } catch (error) {
      console.error("Error fetching user graph data:", error);
      // keep response shape stable
      if (req.query.data === "all_time") {
        return res.json({
          user_data: [] as Array<{ month: string; tasks: number }>,
        });
      }
      return res.json({
        user_data: [] as Array<{ date: string; tasks: number }>,
      });
    }
  },
);

app.listen(3000, () => {
  console.log("listening on port 3000");
});
