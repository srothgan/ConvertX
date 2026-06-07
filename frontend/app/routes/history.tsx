import {
  ArchiveIcon,
  CalendarClockIcon,
  ExternalLinkIcon,
  FileStackIcon,
  Trash2Icon,
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
import { useHistoryQuery } from "~/lib/api/queries";
import type { HistoryJob } from "~/lib/api/schemas";

function statusVariant(job: HistoryJob) {
  if (job.status === "completed") {
    return "default" as const;
  }

  if (job.status === "failed") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function History() {
  const historyQuery = useHistoryQuery();
  const jobs = historyQuery.data ?? [];
  const completed = jobs.filter((job) => job.status === "completed").length;
  const failed = jobs.filter((job) => job.status === "failed").length;

  if (historyQuery.error instanceof AuthRequiredError) {
    return (
      <>
        <PageHeader
          eyebrow="History"
          title="Conversion history"
          description="Review past jobs after signing in."
        />
        <AuthRequiredState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="History"
        title="Conversion history"
        description="Scan previous jobs, inspect their progress, and jump back to result downloads."
      />

      {historyQuery.error ? <ApiErrorNotice error={historyQuery.error} title="Could not load history" /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/95 shadow-sm">
          <CardHeader>
            <CardDescription>Total jobs</CardDescription>
            <CardTitle className="text-3xl">{historyQuery.isLoading ? "-" : jobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/95 shadow-sm">
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{historyQuery.isLoading ? "-" : completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/95 shadow-sm">
          <CardHeader>
            <CardDescription>Needs attention</CardDescription>
            <CardTitle className="text-3xl">{historyQuery.isLoading ? "-" : failed}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Jobs</CardTitle>
              <CardDescription>Newest conversion jobs first.</CardDescription>
            </div>
            <Badge variant="secondary">{jobs.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-xl border bg-muted/30 p-8 text-center">
              <div className="grid justify-items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <FileStackIcon className="size-5" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">No conversion history yet</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Jobs will appear here after a conversion starts from the React workbench.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="grid gap-1">
                        <div className="font-medium">Job {job.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {job.numFiles} files, {job.completedFiles} finished
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarClockIcon className="size-4" />
                        {formatDate(job.dateCreated)}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <div className="grid gap-1">
                        <Progress value={job.progress} />
                        <span className="text-xs text-muted-foreground">{job.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(job)}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon-sm" variant="ghost">
                          <Link aria-label={`Open job ${job.id}`} to={job.resultUrl}>
                            <ExternalLinkIcon />
                          </Link>
                        </Button>
                        <Button asChild disabled={job.files.length === 0} size="icon-sm" variant="ghost">
                          <a aria-label={`Download archive for job ${job.id}`} href={job.archiveUrl}>
                            <ArchiveIcon />
                          </a>
                        </Button>
                        <Button asChild size="icon-sm" variant="ghost">
                          <a aria-label={`Delete job ${job.id}`} href={job.deleteUrl}>
                            <Trash2Icon />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
