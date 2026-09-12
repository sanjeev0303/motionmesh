import { uploadToPresignedUrl } from "../services/uploadToPresignedUrl.js";
import { parseJsonResponse } from "../utils/parseApiResponse.js";
import { UploadToPresignedUrlParams } from "../types/index.js";

const PROXY_BASE_URL = "/api/motionmesh";

const processRequest = async (
  body: Record<string, any>,
  alternateProxyUrl?: string,
): Promise<any> => {
  const proxyUrl = alternateProxyUrl || PROXY_BASE_URL;
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse(response, "Request failed");
};

const processFormDataRequest = async (
  formData: FormData,
  alternateProxyUrl?: string,
): Promise<any> => {
  const proxyUrl = alternateProxyUrl || PROXY_BASE_URL;
  const response = await fetch(proxyUrl, {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse(response, "Request failed");
};

class MotionmeshStorage {
  static videos = {
    initiateUpload: async (
      options: {
        filename: string;
        sizeBytes: number;
        bucketId?: string;
        transcodeBucketId?: string;
        externalUserId?: string;
      },
      alternateProxyUrl?: string,
    ) => {
      const data = await processRequest(
        { type: "upload", ...options },
        alternateProxyUrl,
      );
      return data.uploadData;
    },

    uploadToPresignedUrl: async (params: UploadToPresignedUrlParams) => {
      await uploadToPresignedUrl(params);
    },

    finalizeUpload: async (
      { videoId }: { videoId: string },
      alternateProxyUrl?: string,
    ) => {
      const data = await processRequest(
        { type: "complete", videoId },
        alternateProxyUrl,
      );
      return data.trackingData;
    },

    uploadVideo: async (
      options: {
        video: File;
        filename: string;
        sizeBytes: number;
        bucketId?: string;
        transcodeBucketId?: string;
        externalUserId?: string;
      },
      alternateProxyUrl?: string,
    ) => {
      const formData = new FormData();
      formData.append("type", "dashboardUpload");
      formData.append("video", options.video);
      formData.append("filename", options.filename);
      formData.append("sizeBytes", String(options.sizeBytes));
      if (options.bucketId) formData.append("bucketId", options.bucketId);
      if (options.transcodeBucketId)
        formData.append("transcodeBucketId", options.transcodeBucketId);
      if (options.externalUserId)
        formData.append("externalUserId", options.externalUserId);

      const data = await processFormDataRequest(formData, alternateProxyUrl);
      return data.video;
    },

    getVideo: async (
      { videoId }: { videoId: string },
      alternateProxyUrl?: string,
    ) => {
      const data = await processRequest(
        { type: "getVideo", videoId },
        alternateProxyUrl,
      );
      return data.video;
    },

    listByUser: async (
      { externalUserId, limit, cursor }: { externalUserId?: string; limit?: number; cursor?: string },
      alternateProxyUrl?: string,
    ) => {
      const data = await processRequest(
        { type: "listVideos", externalUserId, limit, cursor },
        alternateProxyUrl,
      );
      return data.videos;
    },

    list: async (
      { limit, cursor }: { limit?: number; cursor?: string },
      alternateProxyUrl?: string,
    ) => {
      const data = await processRequest(
        { type: "listVideos", limit, cursor },
        alternateProxyUrl,
      );
      return data.videos;
    },

    listBuckets: async (alternateProxyUrl?: string) => {
      const data = await processRequest(
        { type: "listBuckets" },
        alternateProxyUrl,
      );
      return data.buckets;
    },
  };
}

export const motionmeshStorage = MotionmeshStorage;