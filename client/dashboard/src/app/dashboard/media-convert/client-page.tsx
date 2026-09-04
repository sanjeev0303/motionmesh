"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCode2, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api-client";

interface TranscodeJob {
  id: string;
  video_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress_percent: number;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  queued:     "bg-bg-surface-raised text-text-muted",
  processing: "bg-accent-motion/20 text-accent-motion border-accent-motion/30",
  completed:  "bg-success/10 text-success border-success/20",
  failed:     "bg-danger/10 text-danger border-danger/20",
};

function JobStatusBadge({ status, progress }: { status: string; progress: number }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={STATUS_STYLES[status] ?? STATUS_STYLES.queued}>
        {status}
      </Badge>
      {status === "processing" && progress > 0 && (
        <span className="text-xs text-text-muted font-mono">{progress}%</span>
      )}
    </div>
  );
}

interface MediaConvertClientProps {
  initialJobs: TranscodeJob[];
}

export function MediaConvertClient({ initialJobs }: MediaConvertClientProps) {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: jobs = [], isFetching, isLoading } = useQuery<TranscodeJob[]>({
    queryKey: ["transcode-jobs"],
    queryFn: async () => {
      const { data, response } = await api.GET("/v1/jobs" as any, {});
      if (!response.ok) return [];
      return (data as unknown as TranscodeJob[]) ?? [];
    },
    initialData: initialJobs,
    refetchInterval: (query) => {
      const rows = (query.state.data as TranscodeJob[] | undefined) ?? [];
      const hasActive = rows.some((j) => j.status === "queued" || j.status === "processing");
      return hasActive ? 5000 : 30000;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const showSkeleton = isLoading && jobs.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight mb-2">Media Convert</h1>
          <p className="text-text-muted">Monitor transcoding jobs for your uploaded videos.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["transcode-jobs"] })}
          disabled={isFetching}
          className="text-text-muted hover:text-text-primary gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {showSkeleton ? (
        <div className="rounded-md border border-border-subtle bg-bg-surface overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-surface-raised">
              <TableRow className="border-border-subtle">
                <TableHead><div className="h-4 bg-bg-surface-raised/50 rounded w-full animate-pulse" /></TableHead>
                <TableHead><div className="h-4 bg-bg-surface-raised/50 rounded w-full animate-pulse" /></TableHead>
                <TableHead><div className="h-4 bg-bg-surface-raised/50 rounded w-3/4 animate-pulse" /></TableHead>
                <TableHead className="text-right"><div className="h-4 bg-bg-surface-raised/50 rounded w-1/2 animate-pulse" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map(i => (
                <TableRow key={i} className="border-border-subtle">
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-3/4 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-3/4 animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-bg-surface-raised/30 rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-full animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-md border border-border-subtle bg-bg-surface overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-surface-raised">
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="text-text-muted font-medium">Job ID</TableHead>
                <TableHead className="text-text-muted font-medium">Video ID</TableHead>
                <TableHead className="text-text-muted font-medium">Status</TableHead>
                <TableHead className="text-text-muted font-medium text-right">Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow className="border-border-subtle hover:bg-transparent">
                  <TableCell colSpan={4} className="h-32 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileCode2 className="h-8 w-8 text-border-subtle opacity-50" />
                      <p>No transcode jobs yet. Upload a video to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id} className="border-border-subtle hover:bg-bg-surface-raised/50 transition-colors">
                    <TableCell className="font-mono text-xs text-text-muted">{job.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-text-primary">{job.video_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} progress={job.progress_percent} />
                    </TableCell>
                    <TableCell suppressHydrationWarning className="text-text-muted text-sm text-right">
                      {new Date(job.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
