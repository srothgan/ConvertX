import { ArrowRightIcon, Loader2Icon, LockKeyholeIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ApiErrorNotice } from "~/components/api-error-notice";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { useLoginMutation } from "~/lib/api/queries";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await loginMutation.mutateAsync({ email, password });
      toast.success("Signed in.");
      navigate(result.redirectTo, { replace: true });
    } catch {
      // The inline error notice carries the typed API message.
    }
  };

  return (
    <div className="grid min-h-[calc(100svh-2.5rem)] place-items-center py-8">
      <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_28rem] lg:items-stretch">
        <div className="hidden rounded-2xl border bg-sidebar p-8 text-sidebar-foreground shadow-sm lg:grid">
          <div className="flex items-start justify-between">
            <div className="grid size-12 place-items-center rounded-xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              CX
            </div>
            <Badge variant="secondary">secure session</Badge>
          </div>
          <div className="mt-auto grid gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                ConvertX access
              </span>
              <h1 className="mt-2 max-w-md text-4xl font-semibold tracking-tight">
                Sign in to run conversion jobs.
              </h1>
            </div>
            <p className="max-w-md text-sm leading-6 text-sidebar-foreground/65">
              The React frontend uses the existing backend cookie session. No auth rewrite, just a cleaner
              screen on top of the current account system.
            </p>
          </div>
        </div>

        <Card className="bg-card/95 shadow-sm">
          <CardHeader className="gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <LockKeyholeIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>Use your existing ConvertX account.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
              {loginMutation.error ? (
                <ApiErrorNotice error={loginMutation.error} title="Could not sign in" />
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  autoComplete="email"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  autoComplete="current-password"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  type="password"
                  value={password}
                />
              </div>

              <Button className="h-10" disabled={loginMutation.isPending} type="submit">
                {loginMutation.isPending ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <ArrowRightIcon data-icon="inline-start" />
                )}
                Sign in
              </Button>

              <Separator />

              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>Need first-time setup?</span>
                <Button asChild size="sm" variant="ghost">
                  <a href="/setup">Open setup</a>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
