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
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { ApiError, AuthRequiredError } from "~/lib/api/client";
import { useLogsQuery } from "~/lib/api/queries";
import type { LogEntry } from "~/lib/api/schemas";
import { cn } from "~/lib/utils";

type LogLevelFilter = "all" | LogEntry["level"];

const levels = ["all", "error", "warn", "info", "log"] satisfies LogLevelFilter[];

const levelStyles = {
  error: {
    badge: "bg-red-800 text-white ring-red-950/25",
    marker: "border-l-red-600",
    row: "bg-red-50/45 hover:bg-red-50/80",
  },
  warn: {
    badge: "bg-amber-300 text-stone-950 ring-amber-700/35",
    marker: "border-l-amber-500",
    row: "bg-amber-50/50 hover:bg-amber-50/85",
  },
  info: {
    badge: "bg-sky-800 text-white ring-sky-950/25",
    marker: "border-l-sky-600",
    row: "bg-sky-50/45 hover:bg-sky-50/80",
  },
  log: {
    badge: "bg-stone-700 text-white ring-stone-950/25",
    marker: "border-l-stone-400",
    row: "bg-white hover:bg-stone-50/90",
  },
} satisfies Record<LogEntry["level"], { badge: string; marker: string; row: string }>;

const filterStyles = {
  all: {
    active: "border-stone-950 bg-stone-950 text-white hover:bg-stone-900",
    inactive: "border-stone-300 bg-white text-stone-900 hover:bg-stone-100",
  },
  error: {
    active: "border-red-800 bg-red-800 text-white hover:bg-red-700",
    inactive: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  },
  warn: {
    active: "border-amber-400 bg-amber-300 text-stone-950 hover:bg-amber-400",
    inactive: "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
  },
  info: {
    active: "border-sky-800 bg-sky-800 text-white hover:bg-sky-700",
    inactive: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  },
  log: {
    active: "border-stone-700 bg-stone-700 text-white hover:bg-stone-600",
    inactive: "border-stone-300 bg-stone-50 text-stone-800 hover:bg-stone-100",
  },
} satisfies Record<LogLevelFilter, { active: string; inactive: string }>;

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
                  className={cn(
                    "font-semibold",
                    level === candidate
                      ? filterStyles[candidate].active
                      : filterStyles[candidate].inactive,
                  )}
                  key={candidate}
                  onClick={() => setLevel(candidate)}
                  size="sm"
                  variant="outline"
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
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="grid gap-1 border-b border-stone-200 bg-stone-50 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="text-sm font-medium text-stone-950">Log stream</div>
                <div className="text-xs text-stone-500">
                  Showing {filteredEntries.length} of {entries.length} entries
                </div>
              </div>
              <div className="max-h-[42rem] overflow-y-auto">
                {filteredEntries.map((entry) => {
                  const style = levelStyles[entry.level];

                  return (
                    <article
                      className={cn(
                        "grid gap-3 border-b border-l-4 border-b-stone-100 px-4 py-3 text-sm transition last:border-b-0 md:grid-cols-[6rem_7rem_minmax(0,1fr)]",
                        style.marker,
                        style.row,
                      )}
                      key={entry.id}
                    >
                      <time className="font-mono text-xs leading-6 text-stone-500">
                        {formatLogTime(entry.timestamp)}
                      </time>
                      <span
                        className={cn(
                          "inline-flex h-6 w-fit items-center gap-1.5 rounded-full px-2 text-xs font-semibold ring-1",
                          style.badge,
                        )}
                      >
                        {levelIcon(entry.level)}
                        {entry.level}
                      </span>
                      <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-[0.8125rem] leading-5 text-stone-900">
                        {entry.message}
                      </pre>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
