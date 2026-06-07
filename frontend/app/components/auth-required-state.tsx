import { LogInIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

const authentikStartUrl = () => {
  const loginUrl = "/outpost.goauthentik.io/start";
  if (typeof window === "undefined") {
    return loginUrl;
  }

  return `${loginUrl}?rd=${encodeURIComponent(window.location.href)}`;
};

export function AuthRequiredState() {
  return (
    <Card className="border-amber-200 bg-amber-50/80 shadow-none">
      <CardContent className="grid gap-4 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="grid size-11 place-items-center rounded-lg bg-amber-100 text-amber-800">
          <ShieldCheckIcon className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Sign in required</h2>
          <p className="text-sm text-stone-600">
            ConvertX is protected by authentik. Start SSO to continue.
          </p>
        </div>
        <Button asChild>
          <a href={authentikStartUrl()}>
            <LogInIcon data-icon="inline-start" />
            Start SSO
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
