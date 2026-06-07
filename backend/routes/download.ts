import path from "node:path";
import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import * as tar from "tar";
import { outputDir } from "..";
import { authService } from "../auth/authentik";
import db from "../db/db";

export const download = new Elysia()
  .use(authService)
  .get(
    "/download/:jobId/:fileName",
    async ({ params, set, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return "File not found.";
      }
      // parse from URL encoded string
      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;
      return Bun.file(filePath);
    },
    {
      auth: true,
    },
  )
  .get(
    "/archive/:jobId",
    async ({ params, set, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return "Archive not found.";
      }

      const jobId = decodeURIComponent(params.jobId);
      const outputPath = `${outputDir}${userId}/${jobId}`;
      const outputTar = path.join(outputPath, `converted_files_${jobId}.tar`);

      await tar.create(
        {
          file: outputTar,
          cwd: outputPath,
          filter: (path) => {
            return !path.match(".*\\.tar");
          },
        },
        ["."],
      );
      return Bun.file(outputTar);
    },
    {
      auth: true,
    },
  );
