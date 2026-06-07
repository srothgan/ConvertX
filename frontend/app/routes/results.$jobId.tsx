import {
  ArchiveIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileWarningIcon,
  Loader2Icon,
  RotateCcwIcon,
} from "lucide-react";
import { Link } from "react-router";
import { ApiErrorNotice } from "~/components/api-error-notice";
import { AuthRequiredState } from "~/components/auth-required-state";
import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
import { useJobQuery } from "~/lib/api/queries";
import type { ConversionJobFile } from "~/lib/api/schemas";
import type { Route } from "./+types/results.$jobId";

function fileBadgeVariant(file: ConversionJobFile) {
  if (file.state === "failed") {
    return "destructive" as const;
  }

  if (file.state === "done") {
    return "default" as const;
  }

  return "outline" as const;
}

function fileBadgeLabel(file: ConversionJobFile) {
  if (file.state === "failed") {
    return "failed";
  }

  if (file.state === "done") {
    return "done";
  }

  return "processing";
}

export default function Results({ params }: Route.ComponentProps) {
  const jobQuery = useJobQuery(params.jobId);
  const job = jobQuery.data;
  const isComplete = job?.status === "completed";
  const hasFailures = job?.files.some((file) => file.state === "failed") ?? false;

  if (jobQuery.error instanceof AuthRequiredError) {
    return (
      <>
        <PageHeader eyebrow="Results" title={`Job ${params.jobId}`} />
        <AuthRequiredState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Results"
        title={`Job ${params.jobId}`}
        description="Progress and downloads are loaded from the new typed JSON API."
      />

      {jobQuery.error && <ApiErrorNotice error={jobQuery.error} title="Could not load results" />}

      {jobQuery.isLoading || !job ? (
        <section className="grid gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </section>
      ) : (
        <section className="grid gap-4">
          <Card className="border-stone-200 bg-white/90 shadow-sm">
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2Icon className="size-5 text-emerald-700" />
                  ) : hasFailures ? (
                    <FileWarningIcon className="size-5 text-red-700" />
                  ) : (
                    <Loader2Icon className="size-5 animate-spin text-stone-500" />
                  )}
                  Conversion {job.status}
                </CardTitle>
                <CardDescription>
                  {job.completedFiles} of {job.numFiles} files finished.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild disabled={!isComplete || job.files.length === 0} variant="outline">
                  <a href={job.archiveUrl}>
                    <ArchiveIcon data-icon="inline-start" />
                    Tar archive
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/workbench">
                    <RotateCcwIcon data-icon="inline-start" />
                    New conversion
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Progress value={job.progress} />
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>{job.progress}% complete</span>
                <span>{new Date(job.dateCreated).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Converted files</CardTitle>
              <CardDescription>
                Download finished files as each converter reports completion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {job.files.length === 0 ? (
                <div className="rounded-xl border bg-stone-50 p-6 text-sm text-stone-600">
                  Conversion has started. Results will appear here as files finish.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Output</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {job.files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="max-w-72 truncate font-medium">
                          {file.outputName}
                        </TableCell>
                        <TableCell className="max-w-64 truncate text-muted-foreground">
                          {file.inputName}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal">
                          <div className="grid gap-1">
                            <Badge className="w-fit" variant={fileBadgeVariant(file)}>
                              {fileBadgeLabel(file)}
                            </Badge>
                            {file.state === "failed" ? (
                              <p className="text-xs leading-5 text-destructive">{file.status}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            disabled={file.state !== "done"}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <a
                              aria-label={`Download ${file.outputName}`}
                              download={file.outputName}
                              href={file.downloadUrl}
                            >
                              <DownloadIcon />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}
