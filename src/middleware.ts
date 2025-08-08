import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import * as dotenv from "dotenv";
dotenv.config();

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(
      token as string,
      process.env.JWT_SECRET_KEY!,
    ) as JwtPayload;
    (req as any).payload = payload;
    console.log(payload); // Attach to req for downstream use
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: (err as any).message,
    });
  }
}
