import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";
import type { Route } from "./+types/root";
import { AppShell } from "./components/app-shell";
import { AppProviders } from "./components/app-providers";
import stylesheet from "./styles/app.css?url";

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }];

export const meta: Route.MetaFunction = () => [
  { title: "ConvertX React" },
  {
    name: "description",
    content: "Parallel React frontend for ConvertX"
  }
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <div className="grid min-h-svh place-items-center bg-background text-foreground">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          CX
        </span>
        <span className="text-sm font-medium text-muted-foreground">ConvertX</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppProviders>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Application error";
  let detail = "The React frontend could not render this route.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail = typeof error.data === "string" ? error.data : detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background p-4 text-foreground">
      <div className="grid w-full max-w-lg gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          ConvertX React
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </main>
  );
}
