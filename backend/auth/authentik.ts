import { Elysia } from "elysia";
import db from "../db/db";
import { User } from "../db/types";
import {
  AUTHENTIK_ADMIN_GROUPS,
  AUTHENTIK_DEV_EMAIL,
  AUTHENTIK_DEV_ENTITLEMENTS,
  AUTHENTIK_DEV_GROUPS,
  AUTHENTIK_DEV_MODE,
  AUTHENTIK_DEV_NAME,
  AUTHENTIK_DEV_UID,
  AUTHENTIK_DEV_USERNAME,
  AUTHENTIK_USER_GROUPS,
} from "../helpers/env";

type RequestHeaders = Record<string, string | undefined>;

type AuthentikIdentity = {
  uid: string;
  email: string | null;
  username: string | null;
  name: string | null;
  groups: string[];
  entitlements: string[];
};

type AuthenticatedUser = {
  id: number;
  authentikUid: string;
  email: string | null;
  username: string | null;
  name: string | null;
  groups: string[];
  entitlements: string[];
  isAdmin: boolean;
};

type AuthResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; status: 401 | 403; code: string; message: string };

const header = (headers: RequestHeaders, name: string) =>
  headers[name.toLowerCase()] ?? headers[name] ?? "";

const nullableHeader = (headers: RequestHeaders, name: string) => {
  const value = header(headers, name).trim();
  return value.length > 0 ? value : null;
};

const parsePipeList = (value: string | undefined) =>
  (value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

const hasAnyGroup = (userGroups: string[], allowedGroups: string[]) => {
  if (allowedGroups.length === 0) {
    return true;
  }

  const userGroupSet = new Set(userGroups);
  return allowedGroups.some((group) => userGroupSet.has(group));
};

const demoIdentity = (): AuthentikIdentity => ({
  uid: AUTHENTIK_DEV_UID,
  email: AUTHENTIK_DEV_EMAIL || null,
  username: AUTHENTIK_DEV_USERNAME || null,
  name: AUTHENTIK_DEV_NAME || null,
  groups: parsePipeList(AUTHENTIK_DEV_GROUPS),
  entitlements: parsePipeList(AUTHENTIK_DEV_ENTITLEMENTS),
});

const identityFromHeaders = (headers: RequestHeaders): AuthentikIdentity | null => {
  const uid = header(headers, "X-authentik-uid").trim();

  if (!uid) {
    if (AUTHENTIK_DEV_MODE && process.env.NODE_ENV !== "production") {
      return demoIdentity();
    }

    return null;
  }

  return {
    uid,
    email: nullableHeader(headers, "X-authentik-email"),
    username: nullableHeader(headers, "X-authentik-username"),
    name: nullableHeader(headers, "X-authentik-name"),
    groups: parsePipeList(header(headers, "X-authentik-groups")),
    entitlements: parsePipeList(header(headers, "X-authentik-entitlements")),
  };
};

const serializeList = (items: string[]) => JSON.stringify(items);

const upsertUser = (identity: AuthentikIdentity, isAdmin: boolean): AuthenticatedUser => {
  const now = new Date().toISOString();
  const existingUser = db
    .query("SELECT * FROM users WHERE authentik_uid = ?")
    .as(User)
    .get(identity.uid);

  if (existingUser) {
    db.query(
      `
      UPDATE users
      SET email = ?, username = ?, name = ?, groups_json = ?, entitlements_json = ?, updated_at = ?
      WHERE authentik_uid = ?
    `,
    ).run(
      identity.email,
      identity.username,
      identity.name,
      serializeList(identity.groups),
      serializeList(identity.entitlements),
      now,
      identity.uid,
    );
  } else {
    db.query(
      `
      INSERT INTO users (
        authentik_uid,
        email,
        username,
        name,
        groups_json,
        entitlements_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      identity.uid,
      identity.email,
      identity.username,
      identity.name,
      serializeList(identity.groups),
      serializeList(identity.entitlements),
      now,
      now,
    );
  }

  const user = db.query("SELECT * FROM users WHERE authentik_uid = ?").as(User).get(identity.uid);
  if (!user) {
    throw new Error("Failed to upsert authentik user.");
  }

  return {
    id: user.id,
    authentikUid: user.authentik_uid,
    email: identity.email,
    username: identity.username,
    name: identity.name,
    groups: identity.groups,
    entitlements: identity.entitlements,
    isAdmin,
  };
};

const getOrCreateAuthentikUser = (headers: RequestHeaders): AuthResult => {
  const identity = identityFromHeaders(headers);

  if (!identity) {
    return {
      success: false,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Sign in through authentik.",
    };
  }

  if (!hasAnyGroup(identity.groups, AUTHENTIK_USER_GROUPS)) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      message: "You are not allowed to use ConvertX.",
    };
  }

  const isAdmin = hasAnyGroup(identity.groups, AUTHENTIK_ADMIN_GROUPS);
  return {
    success: true,
    user: upsertUser(identity, isAdmin),
  };
};

const authError = (result: Extract<AuthResult, { success: false }>) => ({
  success: false,
  error: {
    code: result.code,
    message: result.message,
  },
});

export const authService = new Elysia({ name: "auth/service" })
  .macro("auth", {
    resolve({ headers, status }) {
      const result = getOrCreateAuthentikUser(headers);
      if (!result.success) {
        return status(result.status, authError(result));
      }

      return {
        user: result.user,
      };
    },
  })
  .macro("admin", {
    resolve({ headers, status }) {
      const result = getOrCreateAuthentikUser(headers);
      if (!result.success) {
        return status(result.status, authError(result));
      }

      if (!result.user.isAdmin) {
        return status(403, {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Admin access required.",
          },
        });
      }

      return {
        user: result.user,
      };
    },
  });
