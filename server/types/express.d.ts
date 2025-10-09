import type { ReplitAuthUser } from "./auth";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends ReplitAuthUser {}
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: ReplitAuthUser;
    tenantId?: string;
    dbUser?: User & { tenantId: string | null };
  }
}
