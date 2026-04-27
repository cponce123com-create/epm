import jwt from "jsonwebtoken";

const isProd = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;

if (isProd && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production");
}

const JWT_SECRET = sessionSecret ?? "dev-only-session-secret";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
