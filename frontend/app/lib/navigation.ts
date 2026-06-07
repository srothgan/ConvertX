export type AppNavItem = {
  label: string;
  to: string;
  adminOnly?: boolean;
};

export const appNavItems = [
  { label: "Workbench", to: "/workbench" },
  { label: "History", to: "/history" },
  { label: "Logs", to: "/logs", adminOnly: true },
] satisfies AppNavItem[];
