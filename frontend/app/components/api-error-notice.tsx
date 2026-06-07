import { AlertCircleIcon, BugIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ApiError, ContractError } from "~/lib/api/client";

type ApiErrorNoticeProps = {
  error: unknown;
  title?: string;
};

export function ApiErrorNotice({ error, title = "Something went wrong" }: ApiErrorNoticeProps) {
  const isContractError = error instanceof ContractError;
  const message =
    error instanceof ApiError || error instanceof ContractError
      ? error.message
      : "ConvertX could not complete this action.";

  return (
    <Alert variant={isContractError ? "destructive" : "default"} className="bg-background/80">
      {isContractError ? <BugIcon className="size-4" /> : <AlertCircleIcon className="size-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
