import {
  ActivityIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  FileStackIcon,
  HistoryIcon,
  LogInIcon,
  PlayIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react";
import { Link } from "react-router";
import { ApiErrorNotice } from "~/components/api-error-notice";
import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { AuthRequiredError } from "~/lib/api/client";
import { useConversionFormatsQuery, useHistoryQuery, useSessionQuery } from "~/lib/api/queries";
import type { HistoryJob } from "~/lib/api/schemas";

function isAuthError(error: unknown) {
  return error instanceof AuthRequiredError;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariant(status: HistoryJob["status"]) {
  if (status === "completed") {
    return "default" as const;
  }

  if (status === "failed") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export default function Home() {
  const sessionQuery = useSessionQuery();
  const formatsQuery = useConversionFormatsQuery();
  const historyQuery = useHistoryQuery();

  const isSignedIn = Boolean(sessionQuery.data) && !isAuthError(sessionQuery.error);
  const jobs = historyQuery.data ?? [];
  const activeJobs = jobs.filter((job) => job.status !== "completed" && job.status !== "failed");
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const recentJobs = jobs.slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Home"
        title="ConvertX dashboard"
        description="Start conversions, scan recent jobs, and check catalog coverage."
      />

      {sessionQuery.error && !isAuthError(sessionQuery.error) ? (
        <ApiErrorNotice error={sessionQuery.error} title="Could not verify session" />
      ) : null}
      {formatsQuery.error && !isAuthError(formatsQuery.error) ? (
        <ApiErrorNotice error={formatsQuery.error} title="Could not load format catalog" />
      ) : null}
      {historyQuery.error && !isAuthError(historyQuery.error) ? (
        <ApiErrorNotice error={historyQuery.error} title="Could not load recent jobs" />
      ) : null}

      {!isSignedIn ? (
        <Card className="border-amber-200 bg-amber-50/80 shadow-none">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div className="grid size-11 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <ShieldAlertIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-950">Sign in to run jobs</h2>
              <p className="text-sm text-stone-600">
                The dashboard can show catalog data and conversion history after your session is
                active.
              </p>
            </div>
            <Button asChild>
              <a href="/login">
                <LogInIcon data-icon="inline-start" />
                Open login
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Card className="overflow-hidden border-stone-200 bg-white/95 shadow-sm">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isSignedIn ? "default" : "secondary"}>
                  {isSignedIn ? "Ready" : "Login needed"}
                </Badge>
                <Badge variant="outline">{activeJobs.length} active jobs</Badge>
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">New conversion</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Upload files, choose a compatible output, and follow the job through results.
                </p>
              </div>
            </div>
            <Button asChild className="h-10">
              <Link to="/workbench">
                <PlayIcon data-icon="inline-start" />
                Open workbench
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-stone-200 bg-stone-950 text-stone-50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Workload</CardTitle>
              <Badge className="bg-white/10 text-stone-100 hover:bg-white/10" variant="outline">
                history
              </Badge>
            </div>
            <CardDescription className="text-stone-300">
              {historyQuery.isLoading ? "Reading recent jobs." : `${jobs.length} jobs in history`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-stone-400">Active</div>
              <div className="mt-1 text-2xl font-semibold">
                {historyQuery.isLoading ? "-" : activeJobs.length}
              </div>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-stone-400">Completed</div>
              <div className="mt-1 text-2xl font-semibold">
                {historyQuery.isLoading ? "-" : completedJobs.length}
              </div>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-stone-400">Failed</div>
              <div className="mt-1 text-2xl font-semibold">
                {historyQuery.isLoading ? "-" : failedJobs.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Overview">
        <Card className="border-stone-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <FileStackIcon className="size-4" />
              Source formats
            </CardDescription>
            <CardTitle className="text-3xl">
              {formatsQuery.isLoading ? "-" : (formatsQuery.data?.sources.length ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <SparklesIcon className="size-4" />
              Output formats
            </CardDescription>
            <CardTitle className="text-3xl">
              {formatsQuery.isLoading ? "-" : (formatsQuery.data?.targets.length ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <BadgeCheckIcon className="size-4" />
              Completed jobs
            </CardDescription>
            <CardTitle className="text-3xl">
              {historyQuery.isLoading ? "-" : completedJobs.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <ActivityIcon className="size-4" />
              Needs attention
            </CardDescription>
            <CardTitle className="text-3xl">
              {historyQuery.isLoading ? "-" : failedJobs.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-stone-200 bg-white/95 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Recent jobs</CardTitle>
              <CardDescription>Newest conversions from your history.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/history">
                <HistoryIcon data-icon="inline-start" />
                History
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : !isSignedIn ? (
            <div className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
              Sign in to see recent conversion jobs.
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
              No jobs yet. Start from the workbench when you are ready.
            </div>
          ) : (
            <div className="grid gap-3">
              {recentJobs.map((job) => (
                <article
                  className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto]"
                  key={job.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">Job {job.id}</h3>
                      <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{job.numFiles} files</span>
                      <span>{formatDate(job.dateCreated)}</span>
                    </div>
                    <div className="mt-3 grid gap-1">
                      <Progress value={job.progress} />
                      <span className="text-xs text-muted-foreground">
                        {job.progress}% complete
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={job.resultUrl}>
                      Open
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
