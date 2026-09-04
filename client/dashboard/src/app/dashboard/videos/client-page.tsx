"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { VideoJobRow } from "@/components/dashboard/VideoJobRow";
import { UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Video } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideosClientProps {
  initialVideos: Video[];
}

export function VideosClient({ initialVideos }: VideosClientProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();
  const api = useApi();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.motionmesh.co.in";

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const token = await getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, [getToken]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploading]);

  // Builds absolute API URL for raw fetch multipart calls
  const apiUrl = (path: string) => `${API_BASE}${path}`;

  const { data: serverVideos, isError, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/v1/videos", {});
      if (error || !response.ok) {
        if (response?.status === 401 || response?.status === 403) {
          toast({ title: "Unauthorized", description: "Please log in to view your videos.", variant: "destructive" });
        } else if (response?.status === 429) {
          toast({ title: "Rate Limited", description: "Too many requests. Please try again later.", variant: "destructive" });
        }
        throw new Error("Failed to load videos");
      }
      return data as unknown as Video[];
    },
    initialData: initialVideos,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Poll every 5s only while a video is processing/queued; stops automatically once all are done.
    refetchInterval: (query) => {
      const videos = query.state.data as Video[] | undefined;
      const hasProcessing = videos?.some((v) => v.status === "processing" || v.status === "queued");
      return hasProcessing ? 5000 : false;
    },
  });

  const videos = serverVideos ?? [];
  const showSkeleton = isLoading && videos.length === 0;
  const hasVideos = videos.length > 0;

  const [uploadProgress, setUploadProgress] = useState(0);

  // Thresholds
  const PART_SIZE = 8 * 1024 * 1024; // 8 MiB per part
  const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // use multipart above 5 MiB
  const MAX_CONCURRENT_PARTS = 4; // parallel S3 PUT requests

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsUploading(true);
    setUploadProgress(0);
    toast({ title: "Uploading…", description: `Starting upload for "${file.name}"` });

    try {
      // 1. Initiate video record + get video ID
      const initRes = await api.POST("/v1/videos", {
        body: {
          filename: file.name,
          size_bytes: file.size,
          bucket_id: process.env.NEXT_PUBLIC_MOTIONMESH_BUCKET_ID,
          transcode_bucket_id: process.env.NEXT_PUBLIC_MOTIONMESH_TRANSCODE_BUCKET_ID,
        } as any,
      });

      if (initRes.error || !initRes.response.ok) {
        throw new Error((initRes.error as any)?.message || "Failed to initiate upload");
      }

      const { video: newVideo, upload_url } = initRes.data as any;
      const videoId = newVideo.id;

      if (file.size <= MULTIPART_THRESHOLD) {
        // ── Small file: single presigned PUT ─────────────────────────────────
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", upload_url, true);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`S3 upload failed: ${xhr.statusText}`));
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(file);
        });
        setUploadProgress(90);

        await api.POST("/v1/videos/{id}/finalize-upload" as any, {
          params: { path: { id: videoId } },
        });
      } else {
        // ── Large file: parallel multipart S3 upload ──────────────────────────
        // 1. Create multipart upload
        const createRes = await fetch(
          apiUrl(`/v1/videos/${videoId}/multipart-create?content_type=${encodeURIComponent(file.type || "video/mp4")}`),
          { method: "POST", headers: await getAuthHeaders() }
        );
        if (!createRes.ok) throw new Error("Failed to create multipart upload");
        const { upload_id: uploadId } = await createRes.json();

        // 2. Split file into parts and get presigned URLs for all of them
        const totalParts = Math.ceil(file.size / PART_SIZE);
        const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

        const partsRes = await fetch(apiUrl(`/v1/videos/${videoId}/multipart-parts`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
          body: JSON.stringify({ upload_id: uploadId, part_numbers: partNumbers }),
        });
        if (!partsRes.ok) throw new Error("Failed to get part URLs");
        const { urls } = await partsRes.json() as { urls: Record<string, string> };

        // 3. Upload parts in parallel batches with progress tracking
        const completedParts: { part_number: number; etag: string }[] = [];
        const partProgress = new Array(totalParts).fill(0);

        const uploadPart = (partNumber: number): Promise<void> => {
          return new Promise((resolve, reject) => {
            const start = (partNumber - 1) * PART_SIZE;
            const end = Math.min(start + PART_SIZE, file.size);
            const chunk = file.slice(start, end);
            const presignedUrl = urls[String(partNumber)];
            const partIndex = partNumber - 1;

            const xhr = new XMLHttpRequest();
            xhr.open("PUT", presignedUrl, true);
            
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                partProgress[partIndex] = e.loaded;
                const totalLoaded = partProgress.reduce((sum, loaded) => sum + loaded, 0);
                setUploadProgress(Math.round((totalLoaded / file.size) * 90));
              }
            };
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const etag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "";
                partProgress[partIndex] = chunk.size; // ensure full size is counted
                completedParts.push({ part_number: partNumber, etag });
                resolve();
              } else {
                reject(new Error(`Part ${partNumber} upload failed: ${xhr.statusText}`));
              }
            };
            
            xhr.onerror = () => reject(new Error("Network error during upload"));
            xhr.send(chunk);
          });
        };

        // Run in batches of MAX_CONCURRENT_PARTS
        for (let i = 0; i < partNumbers.length; i += MAX_CONCURRENT_PARTS) {
          const batch = partNumbers.slice(i, i + MAX_CONCURRENT_PARTS);
          await Promise.all(batch.map(uploadPart));
        }

        setUploadProgress(95);

        // 4. Complete multipart upload — sorts parts by number before sending
        completedParts.sort((a, b) => a.part_number - b.part_number);
        const completeRes = await fetch(apiUrl(`/v1/videos/${videoId}/multipart-complete`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
          body: JSON.stringify({ upload_id: uploadId, parts: completedParts }),
        });
        if (!completeRes.ok) {
          // Abort on failure so S3 doesn't accumulate orphaned parts
          await fetch(apiUrl(`/v1/videos/${videoId}/multipart-abort`), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
            body: JSON.stringify({ upload_id: uploadId }),
          });
          throw new Error("Failed to complete multipart upload");
        }
      }

      setUploadProgress(100);
      queryClient.setQueryData(["videos"], (old: Video[] | undefined) => [newVideo, ...(old ?? [])]);
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast({ title: "Upload complete", description: `"${file.name}" is queued for processing.` });
      setIsUploadDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err?.message ?? "Unexpected error", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const openFilePicker = () => {
    (document.getElementById("video-file-input") as HTMLInputElement)?.click();
  };

  return (
    <div className="space-y-6">
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Video</DialogTitle>
            <DialogDescription>
              Upload a new video to your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="pt-4 flex flex-col gap-3">
              <input
                id="video-file-input"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelected}
              />
              <Button
                onClick={openFilePicker}
                disabled={isUploading}
                className="w-full bg-accent-motion text-bg-base hover:bg-accent-motion/90"
              >
                <UploadCloud className={`mr-2 h-4 w-4 ${isUploading ? "animate-pulse" : ""}`} />
                {isUploading ? `Uploading… ${uploadProgress}%` : "Select File & Upload"}
              </Button>
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-bg-surface-raised overflow-hidden">
                    <div
                      className="h-full bg-accent-motion rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted text-center">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">Videos</h1>
          </div>
          <p className="text-text-muted mt-1">Manage transcoded assets, renditions, and captions.</p>
        </div>
        <Button
          onClick={() => setIsUploadDialogOpen(true)}
          disabled={isUploading}
          className="bg-accent-motion text-bg-base hover:bg-accent-motion/90"
        >
          <UploadCloud className={`mr-2 h-4 w-4 ${isUploading ? "animate-pulse" : ""}`} />
          {isUploading ? "Uploading..." : "Upload Video"}
        </Button>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-danger/20 border-dashed rounded-lg bg-danger/5">
          <h3 className="text-lg font-medium text-danger mb-2">Failed to load videos</h3>
          <p className="text-text-muted max-w-sm mb-6">
            There was an error communicating with the server.
          </p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['videos'] })}>
            Retry
          </Button>
        </div>
      ) : showSkeleton ? (
        <div className="rounded-md border border-border-subtle bg-bg-surface overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-surface-raised">
              <TableRow className="border-border-subtle">
                <TableHead className="w-[100px]"></TableHead>
                <TableHead className="w-[400px]"><div className="h-4 bg-bg-surface-raised/50 rounded w-1/2 animate-pulse" /></TableHead>
                <TableHead className="w-[100px] text-right"><div className="h-4 bg-bg-surface-raised/50 rounded w-full animate-pulse" /></TableHead>
                <TableHead className="w-[150px]"><div className="h-4 bg-bg-surface-raised/50 rounded w-3/4 animate-pulse" /></TableHead>
                <TableHead className="w-[150px] text-right"><div className="h-4 bg-bg-surface-raised/50 rounded w-3/4 animate-pulse" /></TableHead>
                <TableHead className="w-[150px] text-right"><div className="h-4 bg-bg-surface-raised/50 rounded w-1/2 animate-pulse" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map(i => (
                <TableRow key={i} className="border-border-subtle">
                  <TableCell><div className="h-16 w-24 bg-bg-surface-raised/30 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-full animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-full animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-bg-surface-raised/30 rounded w-20 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-full animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 bg-bg-surface-raised/30 rounded w-full animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : hasVideos ? (
        <div className="rounded-md border border-border-subtle bg-bg-surface overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-surface-raised">
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="w-[100px]" />
                <TableHead className="text-text-muted font-medium w-[400px]">Title</TableHead>
                <TableHead className="text-text-muted font-medium text-right w-[100px]">Duration</TableHead>
                <TableHead className="text-text-muted font-medium w-[150px]">Status</TableHead>
                <TableHead className="text-text-muted font-medium text-right w-[150px]">Size</TableHead>
                <TableHead className="text-text-muted font-medium text-right w-[150px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <VideoJobRow key={video.id} video={video} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-border-subtle border-dashed rounded-lg bg-bg-surface">
          <div className="h-12 w-12 rounded-full bg-bg-surface-raised flex items-center justify-center mb-4">
            <UploadCloud className="h-6 w-6 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No videos yet</h3>
          <p className="text-text-muted max-w-sm mb-6">
            Upload your first video to start transcoding and generating HLS streams.
          </p>
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            disabled={isUploading}
            className="bg-accent-motion text-bg-base hover:bg-accent-motion/90"
          >
            <UploadCloud className={`mr-2 h-4 w-4 ${isUploading ? "animate-pulse" : ""}`} />
            {isUploading ? "Uploading..." : "Upload Video"}
          </Button>
        </div>
      )}
    </div>
  );
}
