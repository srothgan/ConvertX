import {
  AlertTriangleIcon,
  InfoIcon,
  ListFilterIcon,
  RefreshCwIcon,
  TerminalIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ApiErrorNotice } from "~/components/api-error-notice";
import { AuthRequiredState } from "~/components/auth-required-state";
import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { ApiError, AuthRequiredError } from "~/lib/api/client";
import { useLogsQuery } from "~/lib/api/queries";
import type { LogEntry } from "~/lib/api/schemas";

type LogLevelFilter = "all" | LogEntry["level"];

const levels = ["all", "error", "warn", "info", "log"] satisfies LogLevelFilter[];

function levelBadgeVariant(level: LogEntry["level"]) {
  if (level === "error") {
    return "destructive" as const;
  }

  if (level === "warn") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function levelIcon(level: LogEntry["level"]) {
  if (level === "error" || level === "warn") {
    return <AlertTriangleIcon className="size-4" />;
  }

  if (level === "info") {
    return <InfoIcon className="size-4" />;
  }

  return <TerminalIcon className="size-4" />;
}

function formatLogTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export default function Logs() {
  const [level, setLevel] = useState<LogLevelFilter>("all");
  const [query, setQuery] = useState("");
  const logsQuery = useLogsQuery();
  const entries = logsQuery.data ?? [];
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const levelMatches = level === "all" || entry.level === level;
      const queryMatches =
        normalizedQuery.length === 0 ||
        entry.message.toLowerCase().includes(normalizedQuery) ||
        entry.level.includes(normalizedQuery);

      return levelMatches && queryMatches;
    });
  }, [entries, level, query]);
  const errorCount = entries.filter((entry) => entry.level === "error").length;
  const warningCount = entries.filter((entry) => entry.level === "warn").length;

  if (logsQuery.error instanceof AuthRequiredError) {
    return (
      <>
        <PageHeader
          eyebrow="Logs"
          title="Runtime logs"
          description="Sign in to inspect backend output."
        />
        <AuthRequiredState />
      </>
    );
  }

  if (logsQuery.error instanceof ApiError && logsQuery.error.status === 403) {
    return (
      <>
        <PageHeader
          eyebrow="Logs"
          title="Runtime logs"
          description="Backend logs are available to authentik admins."
        />
        <Card className="border-amber-200 bg-amber-50/80 shadow-none">
          <CardContent className="grid gap-3 p-6">
            <div className="grid size-11 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangleIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-950">Admin access required</h2>
              <p className="text-sm text-stone-600">
                Your authentik groups do not include an admin group for ConvertX.
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Logs"
        title="Runtime logs"
        description="A live view of recent backend console output for the current ConvertX process."
      />

      {logsQuery.error ? (
        <ApiErrorNotice error={logsQuery.error} title="Could not load logs" />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/95 shadow-sm">
          <CardHeader>
            <CardDescription>Buffered entries</CardDescription>
            <CardTitle className="text-3xl">{logsQuery.isLoading ? "-" : entries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/95 shadow-sm">
          <CardHeader>
            <CardDescription>Errors</CardDescription>
            <CardTitle className="text-3xl">{logsQuery.isLoading ? "-" : errorCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/95 shadow-sm">
          <CardHeader>
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-3xl">{logsQuery.isLoading ? "-" : warningCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="bg-card/95 shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Process output</CardTitle>
              <CardDescription>Updates every few seconds while the page is open.</CardDescription>
            </div>
            <Button
              disabled={logsQuery.isFetching}
              onClick={() => void logsQuery.refetch()}
              variant="outline"
            >
              <RefreshCwIcon
                className={logsQuery.isFetching ? "animate-spin" : ""}
                data-icon="inline-start"
              />
              Refresh
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <Input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages, converters, or errors..."
              value={query}
            />
            <div className="flex flex-wrap gap-1">
              {levels.map((candidate) => (
                <Button
                  key={candidate}
                  onClick={() => setLevel(candidate)}
                  size="sm"
                  variant={level === candidate ? "default" : "outline"}
                >
                  {candidate === "all" ? <ListFilterIcon data-icon="inline-start" /> : null}
                  {candidate}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="grid min-h-60 place-items-center rounded-xl border bg-muted/30 p-8 text-center">
              <div className="grid justify-items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <TerminalIcon className="size-5" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">No matching log entries</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Try clearing the search or switching the level filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid max-h-[42rem] gap-2 overflow-y-auto rounded-xl border border-stone-800 bg-stone-950 p-2 text-stone-100 shadow-inner">
              {filteredEntries.map((entry) => (
                <article
                  className="grid gap-2 rounded-lg border border-stone-800 bg-stone-900 p-3 text-sm md:grid-cols-[5rem_6rem_minmax(0,1fr)]"
                  key={entry.id}
                >
                  <time className="font-mono text-xs text-stone-400">
                    {formatLogTime(entry.timestamp)}
                  </time>
                  <Badge className="w-fit" variant={levelBadgeVariant(entry.level)}>
                    {levelIcon(entry.level)}
                    {entry.level}
                  </Badge>
                  <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-stone-100">
                    {entry.message}
                  </pre>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
