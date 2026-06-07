import { ArrowRightIcon, FileIcon, Loader2Icon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import { type ChangeEvent, type DragEvent, useMemo, useReducer, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ApiErrorNotice } from "~/components/api-error-notice";
import { AuthRequiredState } from "~/components/auth-required-state";
import { FormatCombobox, type FormatComboboxOption } from "~/components/format-combobox";
import { PageHeader } from "~/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { AuthRequiredError } from "~/lib/api/client";
import {
  useConversionFormatsQuery,
  useCreateJobMutation,
  useDeleteUploadedFileMutation,
  useSessionQuery,
  useStartConversionMutation,
  useUploadFileMutation,
} from "~/lib/api/queries";
import type { ConversionFormats, ConversionTarget } from "~/lib/api/schemas";
import { formatBytes, getFileSource } from "~/lib/utils";

type QueueFileStatus = "ready" | "uploading" | "uploaded" | "error";

type QueueFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  source: string;
  progress: number;
  status: QueueFileStatus;
  uploadedName?: string | undefined;
  error?: string | undefined;
};

type WorkbenchState = {
  jobId: string | null;
  files: QueueFile[];
  selectedTarget: string;
  dragActive: boolean;
  blockingError: string | null;
};

type WorkbenchAction =
  | { type: "job-created"; jobId: string }
  | { type: "files-added"; files: QueueFile[] }
  | { type: "upload-progress"; id: string; progress: number }
  | { type: "upload-success"; id: string; uploadedName: string; source: string }
  | { type: "upload-error"; id: string; error: string }
  | { type: "file-removed"; id: string }
  | { type: "target-selected"; target: string }
  | { type: "drag-active"; active: boolean }
  | { type: "blocking-error"; message: string | null };

const initialState: WorkbenchState = {
  jobId: null,
  files: [],
  selectedTarget: "",
  dragActive: false,
  blockingError: null,
};

function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case "job-created":
      return {
        ...state,
        jobId: action.jobId,
      };
    case "files-added":
      return {
        ...state,
        files: [...state.files, ...action.files],
        selectedTarget: "",
        blockingError: null,
      };
    case "upload-progress":
      return {
        ...state,
        files: state.files.map((file) =>
          file.id === action.id
            ? { ...file, progress: action.progress, status: "uploading" }
            : file,
        ),
      };
    case "upload-success":
      return {
        ...state,
        files: state.files.map((file) =>
          file.id === action.id
            ? {
                ...file,
                uploadedName: action.uploadedName,
                source: action.source || file.source,
                progress: 100,
                status: "uploaded",
                error: undefined,
              }
            : file,
        ),
        selectedTarget: "",
      };
    case "upload-error":
      return {
        ...state,
        files: state.files.map((file) =>
          file.id === action.id
            ? { ...file, progress: 0, status: "error", error: action.error }
            : file,
        ),
      };
    case "file-removed":
      return {
        ...state,
        files: state.files.filter((file) => file.id !== action.id),
        selectedTarget: "",
      };
    case "target-selected":
      return {
        ...state,
        selectedTarget: action.target,
      };
    case "drag-active":
      return {
        ...state,
        dragActive: action.active,
      };
    case "blocking-error":
      return {
        ...state,
        blockingError: action.message,
      };
    default:
      return state;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ConvertX could not complete the action.";
}

function createQueueFile(file: File): QueueFile {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    source: getFileSource(file.name),
    progress: 0,
    status: "ready",
  };
}

function getSupportedTarget(
  formats: ConversionFormats | undefined,
  source: string,
  target: ConversionTarget,
) {
  return formats?.sources
    .find((candidate) => candidate.extension === source)
    ?.targets.some(
      (candidate) => candidate.target === target.target && candidate.converter === target.converter,
    );
}

function targetOptions({
  formats,
  uploadedSources,
}: {
  formats: ConversionFormats | undefined;
  uploadedSources: string[];
}): FormatComboboxOption[] {
  const uniqueSources = [...new Set(uploadedSources.filter(Boolean))];
  const primarySource = formats?.sources.find(
    (candidate) => candidate.extension === uniqueSources[0],
  );
  if (!primarySource || uniqueSources.length === 0) {
    return [];
  }

  return primarySource.targets
    .filter((target) =>
      uniqueSources.every((sourceExtension) =>
        getSupportedTarget(formats, sourceExtension, target),
      ),
    )
    .map((target) => ({
      value: target.value,
      label: target.label,
      description: target.description,
      meta: `Creates ${target.label} with ${target.converter}`,
      badges:
        uniqueSources.length > 1
          ? [`.${target.target}`, target.converter, `${uniqueSources.length} inputs`]
          : [`.${target.target}`, target.converter],
    }));
}

function selectedTargetFromValue(formats: ConversionFormats | undefined, value: string) {
  for (const source of formats?.sources ?? []) {
    const target = source.targets.find((target) => target.value === value);
    if (target) {
      return target;
    }
  }

  return undefined;
}

export default function Workbench() {
  const [state, dispatch] = useReducer(workbenchReducer, initialState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const sessionQuery = useSessionQuery();
  const formatsQuery = useConversionFormatsQuery();
  const createJobMutation = useCreateJobMutation();
  const uploadMutation = useUploadFileMutation();
  const deleteUploadMutation = useDeleteUploadedFileMutation();
  const startConversionMutation = useStartConversionMutation();

  const uploadedFiles = state.files.filter(
    (file) => file.status === "uploaded" && file.uploadedName,
  );
  const uploadedSources = uploadedFiles.map((file) => file.source);
  const detectedSources = [...new Set(uploadedSources.filter(Boolean))];
  const knownFormatExtensions = new Set(
    formatsQuery.data?.sources.map((source) => source.extension) ?? [],
  );
  const unknownUploadedFiles = uploadedFiles.filter(
    (file) => !file.source || !knownFormatExtensions.has(file.source),
  );
  const targetChoices = useMemo(
    () =>
      targetOptions({
        formats: formatsQuery.data,
        uploadedSources,
      }),
    [formatsQuery.data, uploadedSources],
  );
  const selectedTarget = selectedTargetFromValue(formatsQuery.data, state.selectedTarget);
  const hasUploadingFiles = state.files.some((file) => file.status === "uploading");
  const isTargetPickerDisabled =
    uploadedFiles.length === 0 || unknownUploadedFiles.length > 0 || targetChoices.length === 0;
  const canConvert =
    Boolean(state.jobId) &&
    uploadedFiles.length > 0 &&
    uploadedFiles.length === state.files.length &&
    unknownUploadedFiles.length === 0 &&
    Boolean(selectedTarget) &&
    targetChoices.some((option) => option.value === state.selectedTarget);

  const ensureJob = async () => {
    if (state.jobId) {
      return state.jobId;
    }

    const job = await createJobMutation.mutateAsync();
    dispatch({ type: "job-created", jobId: job.id });
    return job.id;
  };

  const uploadFiles = async (incomingFiles: File[]) => {
    const uniqueFiles = incomingFiles.filter((file) => {
      const alreadyQueued = state.files.some((queuedFile) => queuedFile.name === file.name);
      const duplicateIncoming =
        incomingFiles.filter((candidate) => candidate.name === file.name).length > 1;
      return !alreadyQueued && !duplicateIncoming;
    });

    if (uniqueFiles.length === 0) {
      dispatch({
        type: "blocking-error",
        message: "Choose files with unique names before uploading.",
      });
      return;
    }

    try {
      const jobId = await ensureJob();
      const queueFiles = uniqueFiles.map(createQueueFile);
      dispatch({ type: "files-added", files: queueFiles });

      await Promise.all(
        queueFiles.map(async (queueFile) => {
          try {
            const result = await uploadMutation.mutateAsync({
              jobId,
              file: queueFile.file,
              onProgress: (progress) =>
                dispatch({ type: "upload-progress", id: queueFile.id, progress }),
            });
            const uploaded = result.files[0];
            if (!uploaded) {
              throw new Error("Upload completed without a file response.");
            }

            dispatch({
              type: "upload-success",
              id: queueFile.id,
              uploadedName: uploaded.name,
              source: uploaded.source,
            });
          } catch (error) {
            const message = getErrorMessage(error);
            dispatch({ type: "upload-error", id: queueFile.id, error: message });
            toast.error(message);
          }
        }),
      );
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch({ type: "blocking-error", message });
      toast.error(message);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    void uploadFiles(files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dispatch({ type: "drag-active", active: false });
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  const removeFile = async (file: QueueFile) => {
    dispatch({ type: "file-removed", id: file.id });

    if (state.jobId && file.uploadedName) {
      try {
        await deleteUploadMutation.mutateAsync({ jobId: state.jobId, fileName: file.uploadedName });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const startConversion = async () => {
    if (!state.jobId || !selectedTarget) {
      return;
    }

    try {
      const result = await startConversionMutation.mutateAsync({
        jobId: state.jobId,
        fileNames: uploadedFiles.map((file) => file.uploadedName ?? file.name),
        target: selectedTarget.target,
        converter: selectedTarget.converter,
      });
      toast.success("Conversion started.");
      navigate(result.redirectTo, { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch({ type: "blocking-error", message });
      toast.error(message);
    }
  };

  if (
    sessionQuery.error instanceof AuthRequiredError ||
    formatsQuery.error instanceof AuthRequiredError
  ) {
    return (
      <>
        <PageHeader
          eyebrow="Workbench"
          title="Conversion workbench"
          description="Upload and convert files through your authenticated ConvertX workspace."
        />
        <AuthRequiredState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Workbench"
        title="Conversion workbench"
        description="Upload, inspect, select an output format, and start conversion with typed API contracts."
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="grid gap-4">
          {(sessionQuery.error || formatsQuery.error) && (
            <ApiErrorNotice
              error={sessionQuery.error ?? formatsQuery.error}
              title="Workbench unavailable"
            />
          )}

          {state.blockingError && (
            <Alert variant="destructive">
              <AlertTitle>Action blocked</AlertTitle>
              <AlertDescription>{state.blockingError}</AlertDescription>
            </Alert>
          )}

          <Card className="overflow-visible border-stone-200 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Upload queue</CardTitle>
              <CardDescription>
                Drop files here or browse. The queue uploads immediately to the current conversion
                job.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div
                className={`relative grid min-h-44 cursor-pointer place-items-center rounded-xl border border-dashed p-6 text-center transition ${
                  state.dragActive
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-stone-300 bg-stone-50/80 hover:border-stone-500"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  dispatch({ type: "drag-active", active: true });
                }}
                onDragLeave={() => dispatch({ type: "drag-active", active: false })}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <Input
                  className="sr-only"
                  multiple
                  onChange={handleInputChange}
                  ref={fileInputRef}
                  type="file"
                />
                <div className="grid justify-items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-stone-900 text-stone-50">
                    <UploadCloudIcon className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950">Drop files to upload</h2>
                    <p className="text-sm text-stone-600">
                      Uploads are attached to a new React-created conversion job.
                    </p>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    Browse files
                  </Button>
                </div>
              </div>

              {state.files.length === 0 ? (
                <div className="rounded-xl border bg-stone-50 p-4 text-sm text-stone-600">
                  No files queued yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            <FileIcon className="size-4 shrink-0 text-stone-500" />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatBytes(file.size)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {file.source ? `.${file.source}` : "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-40">
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  file.status === "error"
                                    ? "destructive"
                                    : file.status === "uploaded"
                                      ? "default"
                                      : "outline"
                                }
                              >
                                {file.status}
                              </Badge>
                              {file.status === "uploading" && (
                                <span className="text-xs text-muted-foreground">
                                  {file.progress}%
                                </span>
                              )}
                            </div>
                            {file.status === "uploading" && <Progress value={file.progress} />}
                            {file.error && <p className="text-xs text-destructive">{file.error}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            aria-label={`Remove ${file.name}`}
                            disabled={file.status === "uploading"}
                            onClick={() => void removeFile(file)}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-200 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Format selection</CardTitle>
              <CardDescription>
                Source formats are detected from the uploaded files. Search only the compatible
                targets.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-3 text-sm">
                  <span className="font-medium text-foreground">Detected source</span>
                  {detectedSources.length > 0 ? (
                    detectedSources.map((source) => (
                      <Badge key={source} variant="secondary">
                        .{source}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="destructive">unknown</Badge>
                  )}
                </div>
              )}

              {unknownUploadedFiles.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Unsupported source format</AlertTitle>
                  <AlertDescription>
                    {unknownUploadedFiles.map((file) => file.uploadedName ?? file.name).join(", ")}{" "}
                    could not be matched to a ConvertX input format.
                  </AlertDescription>
                </Alert>
              )}

              {formatsQuery.isLoading ? (
                <Skeleton className="h-20 rounded-xl" />
              ) : (
                <FormatCombobox
                  disabled={isTargetPickerDisabled}
                  emptyLabel="No compatible targets found for the uploaded files."
                  label="Target format"
                  onValueChange={(target) => dispatch({ type: "target-selected", target })}
                  options={targetChoices}
                  placeholder={
                    uploadedFiles.length === 0 ? "Upload files first" : "Choose target format"
                  }
                  searchPlaceholder="Search compatible outputs or converters..."
                  value={state.selectedTarget}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="border-stone-200 bg-stone-950 text-stone-50 shadow-sm">
            <CardHeader>
              <CardTitle>Conversion state</CardTitle>
              <CardDescription className="text-stone-300">
                Current job, upload readiness, and selected converter.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-stone-400">Job</div>
                  <div className="font-medium">{state.jobId ?? "Not created"}</div>
                </div>
                <div className="rounded-lg bg-white/10 p-3">
                  <div className="text-stone-400">Files ready</div>
                  <div className="font-medium">
                    {uploadedFiles.length}/{state.files.length}
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-white/10 p-3 text-sm">
                <div className="text-stone-400">Selected target</div>
                <div className="font-medium">
                  {selectedTarget
                    ? `${selectedTarget.label} via ${selectedTarget.converter}`
                    : "None"}
                </div>
              </div>
              <Button
                className="h-11"
                disabled={!canConvert || hasUploadingFiles || startConversionMutation.isPending}
                onClick={() => void startConversion()}
              >
                {startConversionMutation.isPending ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <ArrowRightIcon data-icon="inline-start" />
                )}
                Start conversion
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}
