import { initiateUpload } from "./initiateUpload.js";
import { uploadVideo } from "./uploadVideo.js";
import { finalizeUpload } from "./finalizeUpload.js";
import { getVideo } from "./getVideo.js";
import { listVideos } from "./listVideos.js";
import { listBuckets } from "./listBuckets.js";
import { extractFileMeta } from "../utils/fileMeta.js";

export const handleProcessRequest = async (
  data: FormData | Record<string, any>,
  credential: string,
): Promise<Response> => {
  if (data instanceof FormData) {
    const video = data.get("video");
    const filename = data.get("filename") as string | null;
    const sizeBytes = Number(data.get("sizeBytes")) || 0;
    const bucketId = (data.get("bucketId") as string | null) || undefined;
    const transcodeBucketId =
      (data.get("transcodeBucketId") as string | null) || undefined;
    const externalUserId =
      (data.get("externalUserId") as string | null) || undefined;

    switch (data.get("type")) {
      case "dashboardUpload": {
        if (!video) {
          throw new Error("[Motionmesh] 'video' field is required");
        }
        const meta = extractFileMeta(
          video as File | Blob | Buffer | Uint8Array,
        );
        const result = await uploadVideo({
          credential,
          filename: filename || meta.filename,
          sizeBytes: sizeBytes || meta.size,
          videoFile: video as File | Blob | Buffer | Uint8Array,
          bucketId,
          transcodeBucketId,
          externalUserId,
        });
        return Response.json({ video: result });
      }
      default:
        throw new Error("[Motionmesh] Unknown type");
    }
  }

  switch (data.type) {
    case "upload": {
      const initData = await initiateUpload({
        credential,
        filename: data.filename,
        sizeBytes: data.sizeBytes,
        bucketId: data.bucketId,
        transcodeBucketId: data.transcodeBucketId,
        externalUserId: data.externalUserId,
      });
      return Response.json({ uploadData: initData });
    }
    case "complete": {
      if (!data.videoId) {
        throw new Error("[Motionmesh] 'videoId' is required");
      }
      const completeData = await finalizeUpload({
        credential,
        videoId: data.videoId,
      });
      return Response.json({ trackingData: completeData });
    }
    case "getVideo": {
      if (!data.videoId) {
        throw new Error("[Motionmesh] 'videoId' is required");
      }
      const video = await getVideo({
        credential,
        videoId: data.videoId,
      });
      return Response.json({ video });
    }
    case "listVideos":
    case "listAllVideos": {
      const videos = await listVideos({
        credential,
        externalUserId: data.externalUserId,
        limit: data.limit,
        cursor: data.cursor,
      });
      return Response.json({ videos });
    }
    case "listBuckets": {
      const buckets = await listBuckets(credential);
      return Response.json({ buckets });
    }
    default:
      throw new Error("[Motionmesh] Unknown type");
  }
};