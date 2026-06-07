import type { z } from "zod";
import {
  apiErrorSchema,
  conversionFormatsResponseSchema,
  deleteJobResponseSchema,
  deleteUploadResponseSchema,
  historyResponseSchema,
  jobResponseSchema,
  logsResponseSchema,
  sessionResponseSchema,
  startConversionResponseSchema,
  uploadResponseSchema,
  type ApiErrorPayload,
  type ConversionFormats,
  type HistoryJob,
  type ConversionJob,
  type LogEntry,
  type Session,
  type UploadResult,
} from "./schemas";

type ApiSuccessSchema<TData> = z.ZodType<{ success: true; data: TData }>;

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(error: ApiErrorPayload, status: number) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

export class AuthRequiredError extends ApiError {
  constructor(message = "Sign in to continue.") {
    super({ code: "AUTH_REQUIRED", message }, 401);
    this.name = "AuthRequiredError";
  }
}

export class ContractError extends Error {
  details: unknown;

  constructor(message: string, details: unknown) {
    super(message);
    this.name = "ContractError";
    this.details = details;
  }
}

const parseJson = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (response.redirected || response.url.includes("/outpost.goauthentik.io")) {
      throw new AuthRequiredError();
    }

    throw new ContractError("Expected a JSON response from the ConvertX API.", {
      status: response.status,
      url: response.url,
    });
  }

  return response.json() as Promise<unknown>;
};

const parseApiResult = <TData>(
  json: unknown,
  schema: ApiSuccessSchema<TData>,
  status: number,
): TData => {
  const errorResult = apiErrorSchema.safeParse(json);
  if (errorResult.success) {
    if (errorResult.data.error.code === "AUTH_REQUIRED") {
      throw new AuthRequiredError(errorResult.data.error.message);
    }

    throw new ApiError(errorResult.data.error, status);
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ContractError("The ConvertX API response did not match the frontend contract.", {
      issues: result.error.issues,
      json,
    });
  }

  return result.data.data;
};

async function apiRequest<TData>(
  path: string,
  schema: ApiSuccessSchema<TData>,
  init?: RequestInit,
): Promise<TData> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const json = await parseJson(response);
  return parseApiResult(json, schema, response.status);
}

const parseXhrJson = <TData>(xhr: XMLHttpRequest, schema: ApiSuccessSchema<TData>) => {
  let json: unknown;
  try {
    json = JSON.parse(xhr.responseText);
  } catch (error) {
    throw new ContractError("Upload response was not valid JSON.", {
      status: xhr.status,
      response: xhr.responseText,
      error,
    });
  }

  return parseApiResult(json, schema, xhr.status);
};

export function fetchSession(): Promise<Session> {
  return apiRequest("/api/session", sessionResponseSchema);
}

export function fetchConversionFormats(): Promise<ConversionFormats> {
  return apiRequest("/api/conversion-formats", conversionFormatsResponseSchema);
}

export async function createJob(): Promise<ConversionJob> {
  const result = await apiRequest("/api/jobs", jobResponseSchema, {
    method: "POST",
  });

  return result.job;
}

export async function fetchJob(jobId: string): Promise<ConversionJob> {
  const result = await apiRequest(`/api/jobs/${encodeURIComponent(jobId)}`, jobResponseSchema);
  return result.job;
}

export async function fetchHistory(): Promise<HistoryJob[]> {
  const result = await apiRequest("/api/history", historyResponseSchema);
  return result.jobs;
}

export async function deleteJob(jobId: string): Promise<string> {
  const result = await apiRequest(
    `/api/jobs/${encodeURIComponent(jobId)}`,
    deleteJobResponseSchema,
    {
      method: "DELETE",
    },
  );

  return result.jobId;
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const result = await apiRequest("/api/logs", logsResponseSchema);
  return result.entries;
}

export function uploadJobFile({
  jobId,
  file,
  onProgress,
}: {
  jobId: string;
  file: File;
  onProgress?: (progress: number) => void;
}) {
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file, file.name);

    xhr.open("POST", `/api/jobs/${encodeURIComponent(jobId)}/upload`, true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      try {
        if (xhr.status === 401) {
          reject(new AuthRequiredError());
          return;
        }

        resolve(parseXhrJson(xhr, uploadResponseSchema));
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new ApiError({ code: "UPLOAD_NETWORK_ERROR", message: "Upload failed." }, xhr.status));
    };

    xhr.send(formData);
  });
}

export function deleteUploadedFile(jobId: string, fileName: string) {
  return apiRequest(
    `/api/jobs/${encodeURIComponent(jobId)}/uploads/delete`,
    deleteUploadResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({ fileName }),
    },
  );
}

export function startConversion({
  jobId,
  fileNames,
  target,
  converter,
}: {
  jobId: string;
  fileNames: string[];
  target: string;
  converter: string;
}) {
  return apiRequest(
    `/api/jobs/${encodeURIComponent(jobId)}/convert`,
    startConversionResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({ fileNames, target, converter }),
    },
  );
}
