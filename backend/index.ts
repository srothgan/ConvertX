import { existsSync, rmSync } from "node:fs";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import "./helpers/logs";
import "./helpers/printVersions";
import db from "./db/db";
import { Jobs } from "./db/types";
import { AUTO_DELETE_EVERY_N_HOURS, WEBROOT } from "./helpers/env";
import { api } from "./routes/api";
import { download } from "./routes/download";
import { healthcheck } from "./routes/healthcheck";

export const uploadsDir = "./data/uploads/";
export const outputDir = "./data/output/";
const reactClientDir = "./frontend/build/client";
const reactIndexPath = `${reactClientDir}/index.html`;
const reservedSpaPrefixes = ["/api", "/download", "/archive", "/health", "/outpost.goauthentik.io"];

const stripWebroot = (pathname: string) => {
  if (!WEBROOT || !pathname.startsWith(WEBROOT)) {
    return pathname;
  }

  return pathname.slice(WEBROOT.length) || "/";
};

const isReservedSpaPath = (pathname: string) => {
  const appPath = stripWebroot(pathname);
  return reservedSpaPrefixes.some(
    (prefix) => appPath === prefix || appPath.startsWith(`${prefix}/`),
  );
};

// Fix for Elysia issue with Bun, (see https://github.com/oven-sh/bun/issues/12161)
process.getBuiltinModule = require;

const app = new Elysia({
  serve: {
    maxRequestBodySize: Number.MAX_SAFE_INTEGER,
  },
  prefix: WEBROOT,
})
  .use(api)
  .use(download)
  .use(healthcheck)
  .use(
    staticPlugin({
      assets: "public",
      prefix: "",
      alwaysStatic: true,
    }),
  )
  .onError(({ error }) => {
    console.error(error);
  });

if (existsSync(reactClientDir)) {
  app.use(
    staticPlugin({
      assets: reactClientDir,
      prefix: "",
      alwaysStatic: true,
    }),
  );
}

const serveSpa = ({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) => {
  const pathname = new URL(request.url).pathname;
  if (isReservedSpaPath(pathname)) {
    set.status = 404;
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Not found.",
      },
    };
  }

  if (!existsSync(reactIndexPath)) {
    set.status = 503;
    return {
      success: false,
      error: {
        code: "SPA_NOT_BUILT",
        message: "Frontend build is missing. Run bun run frontend:build.",
      },
    };
  }

  set.headers["content-type"] = "text/html; charset=utf-8";
  return Bun.file(reactIndexPath);
};

app.get("/", serveSpa);
app.get("/*", serveSpa);

app.listen(process.env.PORT || 3000);

console.log(`Elysia is running at http://${app.server?.hostname}:${app.server?.port}${WEBROOT}`);

const clearJobs = () => {
  const jobs = db
    .query("SELECT * FROM jobs WHERE date_created < ?")
    .as(Jobs)
    .all(new Date(Date.now() - AUTO_DELETE_EVERY_N_HOURS * 60 * 60 * 1000).toISOString());

  for (const job of jobs) {
    // delete the directories
    rmSync(`${outputDir}${job.user_id}/${job.id}`, {
      recursive: true,
      force: true,
    });
    rmSync(`${uploadsDir}${job.user_id}/${job.id}`, {
      recursive: true,
      force: true,
    });

    // delete the job
    db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
  }

  setTimeout(clearJobs, AUTO_DELETE_EVERY_N_HOURS * 60 * 60 * 1000);
};

if (AUTO_DELETE_EVERY_N_HOURS > 0) {
  clearJobs();
}
