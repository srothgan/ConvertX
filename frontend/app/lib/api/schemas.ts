import { z } from "zod";

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const apiSuccess = <T extends z.ZodType>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
  });

export const sessionResponseSchema = apiSuccess(
  z.object({
    authenticated: z.literal(true),
    user: z.object({
      id: z.string(),
      email: z.string().nullable(),
      username: z.string().nullable(),
      name: z.string().nullable(),
      groups: z.array(z.string()),
      entitlements: z.array(z.string()),
      isAdmin: z.boolean(),
    }),
    loginUrl: z.string(),
    logoffUrl: z.string(),
  }),
);

export const conversionTargetSchema = z.object({
  value: z.string(),
  source: z.string(),
  target: z.string(),
  converter: z.string(),
  label: z.string(),
  description: z.string(),
});

export const sourceFormatSchema = z.object({
  extension: z.string(),
  label: z.string(),
  description: z.string(),
  aliases: z.array(z.string()),
  targetCount: z.number(),
  targets: z.array(conversionTargetSchema),
});

export const conversionFormatsResponseSchema = apiSuccess(
  z.object({
    sources: z.array(sourceFormatSchema),
    targets: z.array(
      z.object({
        extension: z.string(),
        label: z.string(),
        description: z.string(),
      }),
    ),
    converters: z.array(z.string()),
  }),
);

export const jobFileSchema = z.object({
  id: z.string(),
  inputName: z.string(),
  outputName: z.string(),
  status: z.string(),
  state: z.enum(["processing", "done", "failed"]),
  downloadUrl: z.string(),
});

export const jobSchema = z.object({
  id: z.string(),
  dateCreated: z.string(),
  status: z.string(),
  numFiles: z.number(),
  completedFiles: z.number(),
  progress: z.number(),
  archiveUrl: z.string(),
  files: z.array(jobFileSchema),
});

export const jobResponseSchema = apiSuccess(
  z.object({
    job: jobSchema,
  }),
);

export const uploadResponseSchema = apiSuccess(
  z.object({
    jobId: z.string(),
    files: z.array(
      z.object({
        name: z.string(),
        originalName: z.string(),
        size: z.number(),
        mimeType: z.string(),
        source: z.string(),
      }),
    ),
  }),
);

export const deleteUploadResponseSchema = apiSuccess(
  z.object({
    jobId: z.string(),
    fileName: z.string(),
  }),
);

export const startConversionResponseSchema = apiSuccess(
  z.object({
    jobId: z.string(),
    status: z.string(),
    redirectTo: z.string(),
  }),
);

export const historyJobSchema = jobSchema.extend({
  resultUrl: z.string(),
});

export const deleteJobResponseSchema = apiSuccess(
  z.object({
    jobId: z.string(),
  }),
);

export const historyResponseSchema = apiSuccess(
  z.object({
    jobs: z.array(historyJobSchema),
  }),
);

export const logEntrySchema = z.object({
  id: z.string(),
  level: z.enum(["log", "info", "warn", "error"]),
  message: z.string(),
  timestamp: z.string(),
});

export const logsResponseSchema = apiSuccess(
  z.object({
    entries: z.array(logEntrySchema),
  }),
);

export type ApiErrorPayload = z.infer<typeof apiErrorSchema>["error"];
export type Session = z.infer<typeof sessionResponseSchema>["data"];
export type ConversionFormats = z.infer<typeof conversionFormatsResponseSchema>["data"];
export type ConversionTarget = z.infer<typeof conversionTargetSchema>;
export type SourceFormat = z.infer<typeof sourceFormatSchema>;
export type ConversionJob = z.infer<typeof jobSchema>;
export type ConversionJobFile = z.infer<typeof jobFileSchema>;
export type UploadResult = z.infer<typeof uploadResponseSchema>["data"];
export type HistoryJob = z.infer<typeof historyJobSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
