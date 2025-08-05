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

app.get("/api/v1/tasks-info", (req: express.Request, res: express.Response) => {
  return;
});

app.get(
  "/api/v1/leaderboard",
  (req: express.Request, res: express.Response) => {
    return;
  },
);

app.get("/api/v1/user-graph", (req: express.Request, res: express.Response) => {
  return;
});

app.listen(3000, () => {
  console.log("listening on port 3000");
});
