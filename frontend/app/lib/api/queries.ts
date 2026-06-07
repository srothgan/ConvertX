import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createJob,
  deleteUploadedFile,
  fetchConversionFormats,
  fetchHistory,
  fetchJob,
  fetchLogs,
  fetchSession,
  login,
  logoff,
  startConversion,
  uploadJobFile
} from "./client";

export const queryKeys = {
  session: ["session"] as const,
  formats: ["conversion-formats"] as const,
  job: (jobId: string) => ["job", jobId] as const,
  history: ["history"] as const,
  logs: ["logs"] as const
};

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    retry: false
  });
}

export function useConversionFormatsQuery() {
  return useQuery({
    queryKey: queryKeys.formats,
    queryFn: fetchConversionFormats,
    staleTime: 1000 * 60 * 30,
    retry: false
  });
}

export function useJobQuery(jobId: string) {
  return useQuery({
    queryKey: queryKeys.job(jobId),
    queryFn: () => fetchJob(jobId),
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job || job.status === "completed" || job.status === "failed") {
        return false;
      }

      return 1500;
    },
    retry: false
  });
}

export function useCreateJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.job(job.id), job);
    }
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
    }
  });
}

export function useLogoffMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoff,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
    }
  });
}

export function useHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: fetchHistory,
    retry: false
  });
}

export function useLogsQuery() {
  return useQuery({
    queryKey: queryKeys.logs,
    queryFn: fetchLogs,
    refetchInterval: 3000,
    retry: false
  });
}

export function useUploadFileMutation() {
  return useMutation({
    mutationFn: uploadJobFile
  });
}

export function useDeleteUploadedFileMutation() {
  return useMutation({
    mutationFn: ({ jobId, fileName }: { jobId: string; fileName: string }) =>
      deleteUploadedFile(jobId, fileName)
  });
}

export function useStartConversionMutation() {
  return useMutation({
    mutationFn: startConversion
  });
}
