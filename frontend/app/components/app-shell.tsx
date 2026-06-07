import { LogInIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { appNavItems } from "~/lib/navigation";
import { cn } from "~/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 flex max-h-svh flex-col gap-5 border-b bg-sidebar p-4 text-sidebar-foreground lg:h-svh lg:border-b-0 lg:border-r lg:border-sidebar-border">
        <Link className="flex items-center gap-3 rounded-lg px-1 py-1.5" to="/">
          <span className="grid size-10 place-items-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            CX
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-sm font-semibold tracking-tight">ConvertX</span>
            <span className="truncate text-xs text-sidebar-foreground/60">React workbench</span>
          </span>
        </Link>

        <Separator className="bg-sidebar-border" />

        <nav className="flex gap-1 overflow-x-auto lg:grid lg:overflow-visible" aria-label="Primary">
          {appNavItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                )
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 lg:grid">
          <Button asChild size="sm" variant="secondary">
            <a href="/login">
              <LogInIcon data-icon="inline-start" />
              Open login
            </a>
          </Button>
        </div>
      </aside>

      <main className="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-5">{children}</div>
      </main>
    </div>
  );
}
