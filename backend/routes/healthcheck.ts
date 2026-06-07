import Elysia from "elysia";

export const healthcheck = new Elysia().get("/health", () => {
  return { status: "ok" };
});
