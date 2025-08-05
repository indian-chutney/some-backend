import {} from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import * as dotenvx from "@dotenvx/dotenvx";
dotenvx.config();
const JWKS = createRemoteJWKSet(new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys"));
export async function authenticate(req, res, next) {
    const auth_header = req.headers.authorization;
    if (!auth_header || !auth_header.startsWith("Bearer")) {
        res.status(403).json({
            message: "no token given",
        });
        return;
    }
    try {
        const idToken = auth_header.split(" ")[1];
        const { payload } = await jwtVerify(idToken, JWKS, {
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`, // Use your real tenant ID
            audience: process.env.AZURE_CLIENT_ID,
        });
        console.log(payload);
        req.payload = payload;
        next();
    }
    catch (err) {
        res.status(403).json({
            message: "error verifying token" + err,
        });
        return;
    }
}
//# sourceMappingURL=middleware.js.map