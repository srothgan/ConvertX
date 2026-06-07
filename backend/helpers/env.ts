const booleanEnv = (name: string) => process.env[name]?.toLowerCase() === "true";

const csvEnv = (name: string, fallback: string[]) => {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const AUTO_DELETE_EVERY_N_HOURS = process.env.AUTO_DELETE_EVERY_N_HOURS
  ? Number(process.env.AUTO_DELETE_EVERY_N_HOURS)
  : 24;

export const HIDE_HISTORY = process.env.HIDE_HISTORY?.toLowerCase() === "true" || false;

export const WEBROOT = process.env.WEBROOT ?? "";

export const MAX_CONVERT_PROCESS =
  process.env.MAX_CONVERT_PROCESS && Number(process.env.MAX_CONVERT_PROCESS) > 0
    ? Number(process.env.MAX_CONVERT_PROCESS)
    : 0;

export const AUTHENTIK_DEV_MODE = booleanEnv("AUTHENTIK_DEV_MODE");

export const AUTHENTIK_DEV_UID = process.env.AUTHENTIK_DEV_UID || "local-admin";

export const AUTHENTIK_DEV_EMAIL = process.env.AUTHENTIK_DEV_EMAIL || "demo@mail.de";

export const AUTHENTIK_DEV_USERNAME = process.env.AUTHENTIK_DEV_USERNAME || "demo";

export const AUTHENTIK_DEV_NAME = process.env.AUTHENTIK_DEV_NAME || "ConvertX Demo Admin";

export const AUTHENTIK_DEV_GROUPS = process.env.AUTHENTIK_DEV_GROUPS || "admins|users";

export const AUTHENTIK_DEV_ENTITLEMENTS = process.env.AUTHENTIK_DEV_ENTITLEMENTS || "";

export const AUTHENTIK_ADMIN_GROUPS = csvEnv("AUTHENTIK_ADMIN_GROUPS", ["admins"]);

export const AUTHENTIK_USER_GROUPS = csvEnv("AUTHENTIK_USER_GROUPS", ["users", "admins"]);

if (process.env.NODE_ENV === "production" && AUTHENTIK_DEV_MODE) {
  throw new Error("AUTHENTIK_DEV_MODE=true is not allowed when NODE_ENV=production.");
}
