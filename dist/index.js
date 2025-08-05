import express from "express";
import { createClient } from "@supabase/supabase-js";
import * as dotenvx from "@dotenvx/dotenvx";
import cors from "cors";
import { authenticate } from "./middleware.js";
import {} from "./types/supabase.js";
import axios from "axios";
import qs from "querystring";
import { decodeJwt } from "jose";
dotenvx.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const app = express();
app.use(express.json());
app.use(cors());
app.get("/api/v1/auth/redirect", async (req, res) => {
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
        const response = await axios.post(tokenEndpoint, qs.stringify(payload), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
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
            console.log("Redirecting to (user exists):", url);
            return res.redirect(url);
        }
        // Insert user if not exists
        await supabase
            .from("users")
            .insert({ user_id: user.oid, username: user.name });
        const url = `http://localhost:5173/auth/success?id_token=${encodeURIComponent(id_token)}&exists=false`;
        console.log("Redirecting to (new user):", url);
        return res.redirect(url);
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Token error:", error.response?.data || error.message);
            res.status(500).send("Authentication failed");
        }
        else {
            console.error("Unexpected error:", error);
            res.status(500).send("Unexpected error");
        }
    }
});
app.use(authenticate);
app.post("/api/v1/role", async (req, res) => {
    const role = req.body.role;
    try {
        await supabase.from("users").update({ role: role });
        res.json({
            message: "role updated",
        });
    }
    catch (err) {
        console.error("Database error: ", err);
        res.status(500).send("Database error");
    }
    return;
});
app.get("/api/v1/health-bar", (req, res) => { });
app.get("/api/v1/avatar-info", (req, res) => {
    return;
});
app.post("/api/v1/avatar-info", (req, res) => {
    const avatar_data = req.body.avatar_data;
});
app.get("/api/v1/tasks-info", (req, res) => {
    return;
});
app.get("/api/v1/leaderboard", (req, res) => {
    return;
});
app.get("/api/v1/user-graph", (req, res) => {
    return;
});
app.listen(3000, () => {
    console.log("listening on port 3000");
});
//# sourceMappingURL=index.js.map