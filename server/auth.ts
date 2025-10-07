import { Request, Response, NextFunction } from "express";
import "express-session";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated) {
    return next();
  }
  
  res.status(401).json({ error: "Authentication required" });
}

export function verifyPassword(password: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  
  if (!appPassword) {
    throw new Error("APP_PASSWORD environment variable not set");
  }
  
  return password === appPassword;
}
