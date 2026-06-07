export type AppNavItem = {
  label: string;
  to: string;
};

export const appNavItems = [
  { label: "Workbench", to: "/workbench" },
  { label: "History", to: "/history" },
] satisfies AppNavItem[];
