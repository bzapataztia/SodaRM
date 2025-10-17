import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import type { TokenSet, UserinfoResponse } from "openid-client";
import { Issuer } from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";

import { storage } from "./storage";
import type { AuthenticatedUser, AuthUserClaims } from "./types/auth";

const OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL;
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;

if (!OIDC_ISSUER_URL) {
  throw new Error("Environment variable OIDC_ISSUER_URL not provided");
}

if (!OIDC_CLIENT_ID) {
  throw new Error("Environment variable OIDC_CLIENT_ID not provided");
}

const APP_BASE_URL = process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? "5000"}`;
const CALLBACK_PATH = process.env.OIDC_CALLBACK_PATH ?? "/api/callback";
const CALLBACK_URL = process.env.OIDC_CALLBACK_URL ?? `${APP_BASE_URL.replace(/\/$/, "")}${CALLBACK_PATH}`;
const LOGOUT_REDIRECT_URL = process.env.OIDC_LOGOUT_REDIRECT_URL ?? APP_BASE_URL;
const STRATEGY_NAME = process.env.OIDC_STRATEGY_NAME ?? "oidc";

const getOidcClient = memoize(
  async () => {
    const issuer = await Issuer.discover(OIDC_ISSUER_URL);
    return new issuer.Client({
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      redirect_uris: [CALLBACK_URL],
      response_types: ["code"],
    });
  },
  { maxAge: 60 * 60 * 1000 },
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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function buildClaims(tokenSet: TokenSet, userinfo?: UserinfoResponse): AuthUserClaims {
  const raw = tokenSet.claims();
  const merged = { ...userinfo, ...raw } as Record<string, unknown>;

  const sub = typeof merged.sub === "string" ? merged.sub : undefined;
  if (!sub) {
    throw new Error("Missing subject claim in authentication response");
  }

  const email = typeof merged.email === "string" ? merged.email : undefined;
  const firstName =
    typeof merged.given_name === "string"
      ? merged.given_name
      : typeof merged.first_name === "string"
      ? merged.first_name
      : undefined;
  const lastName =
    typeof merged.family_name === "string"
      ? merged.family_name
      : typeof merged.last_name === "string"
      ? merged.last_name
      : undefined;
  const profileImageUrl =
    typeof merged.picture === "string"
      ? merged.picture
      : typeof merged.profile_image_url === "string"
      ? merged.profile_image_url
      : undefined;

  return {
    sub,
    email,
    first_name: firstName,
    last_name: lastName,
    profile_image_url: profileImageUrl,
    raw: merged,
  };
}

function buildAuthUser(tokenSet: TokenSet, userinfo?: UserinfoResponse): AuthenticatedUser {
  const claims = buildClaims(tokenSet, userinfo);
  const expiresAt = typeof tokenSet.expires_at === "number" ? tokenSet.expires_at : undefined;
  return {
    claims,
    access_token: tokenSet.access_token ?? undefined,
    refresh_token: tokenSet.refresh_token ?? undefined,
    expires_at: expiresAt,
    id_token: tokenSet.id_token ?? undefined,
  };
}

function updateUserSession(user: AuthenticatedUser, tokenSet: TokenSet, userinfo?: UserinfoResponse) {
  const updated = buildAuthUser(tokenSet, userinfo);
  user.claims = updated.claims;
  user.access_token = updated.access_token;
  user.refresh_token = updated.refresh_token ?? user.refresh_token;
  user.expires_at = updated.expires_at;
  user.id_token = updated.id_token ?? user.id_token;
}

async function upsertUser(claims: AuthUserClaims) {
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

  const client = await getOidcClient();

  const verify: VerifyFunction = async (tokenSet, userinfo, done) => {
    try {
      const user = buildAuthUser(tokenSet, userinfo ?? undefined);
      await upsertUser(user.claims);
      done(null, user as Express.User);
    } catch (error) {
      done(error as Error);
    }
  };

  const strategy = new Strategy(
    {
      name: STRATEGY_NAME,
      client,
      params: {
        scope: "openid email profile offline_access",
        redirect_uri: CALLBACK_URL,
      },
      usePKCE: "S256",
    },
    verify,
  );

  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(STRATEGY_NAME, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(STRATEGY_NAME, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    const tokenSet = req.user;
    const oidcClient = await getOidcClient();
    const endSessionUrl = oidcClient.endSessionUrl({
      id_token_hint: tokenSet?.id_token,
      post_logout_redirect_uri: LOGOUT_REDIRECT_URL,
    });

    req.logout(() => {
      res.redirect(endSessionUrl);
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as AuthenticatedUser | undefined;

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
    const client = await getOidcClient();
    const tokenSet = await client.refresh(refreshToken);
    updateUserSession(user, tokenSet);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};