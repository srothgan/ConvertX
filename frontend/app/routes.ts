import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("workbench", "routes/workbench.tsx"),
  route("history", "routes/history.tsx"),
  route("logs", "routes/logs.tsx"),
  route("results/:jobId", "routes/results.$jobId.tsx"),
] satisfies RouteConfig;
