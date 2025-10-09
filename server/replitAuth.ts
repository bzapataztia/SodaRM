import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type {
  ReplitAuthClaims,
  ReplitAuthUser,
} from "./types/auth";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function toReplitClaims(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
): ReplitAuthClaims {
  const rawClaims = tokens.claims();

  if (typeof rawClaims.sub !== "string") {
    throw new Error("Missing subject claim in authentication response");
  }

  return {
    sub: rawClaims.sub,
    email: typeof rawClaims.email === "string" ? rawClaims.email : undefined,
    first_name:
      typeof rawClaims.first_name === "string" ? rawClaims.first_name : undefined,
    last_name:
      typeof rawClaims.last_name === "string" ? rawClaims.last_name : undefined,
    profile_image_url:
      typeof rawClaims.profile_image_url === "string"
        ? rawClaims.profile_image_url
        : undefined,
    raw: rawClaims as Record<string, unknown>,
  };
}

function buildAuthUser(
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
): ReplitAuthUser {
  const claims = toReplitClaims(tokens);
  const exp = tokens.claims().exp;

  return {
    claims,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: typeof exp === "number" ? exp : undefined,
  };
}

function updateUserSession(
  user: ReplitAuthUser,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  const updated = buildAuthUser(tokens);
  user.claims = updated.claims;
  user.access_token = updated.access_token;
  user.refresh_token = updated.refresh_token;
  user.expires_at = updated.expires_at;
}

async function upsertUser(claims: ReplitAuthClaims) {
  await storage.upsertUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.first_name,
    lastName: claims.last_name,
    profileImageUrl: claims.profile_image_url,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
  ) => {
    try {
      const user = buildAuthUser(tokens);
      await upsertUser(user.claims);
      verified(null, user as Express.User);
    } catch (error) {
      verified(error as Error);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
