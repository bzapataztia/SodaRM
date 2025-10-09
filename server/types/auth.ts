import type { ParamsDictionary } from "express-serve-static-core";
import type { Request } from "express";
import type { ParsedQs } from "qs";
import type { User } from "@shared/schema";

export interface ReplitAuthClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  raw: Record<string, unknown>;
}

export interface ReplitAuthUser {
  claims: ReplitAuthClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export type AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = Record<string, unknown>,
  ReqQuery = ParsedQs
> = Request<P, ResBody, ReqBody, ReqQuery> & {
  user?: ReplitAuthUser;
  tenantId?: string;
  dbUser?: User & { tenantId: string | null };
};

export type TenantBoundRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = Record<string, unknown>,
  ReqQuery = ParsedQs
> = AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery> & {
  tenantId: string;
  dbUser: User & { tenantId: string };
};
