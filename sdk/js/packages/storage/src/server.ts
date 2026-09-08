import { handleProcessRequest } from "./services/processRequest.js";
import { verifyApiKeySignature } from "./utils/apiKeySignature.js";
import { PlanRequiredError } from "./utils/handleApiError.js";
import { initiateUpload } from "./services/initiateUpload.js";
import { finalizeUpload } from "./services/finalizeUpload.js";
import { getVideo } from "./services/getVideo.js";
import { uploadToPresignedUrl } from "./services/uploadToPresignedUrl.js";

export {
  handleProcessRequest,
  verifyApiKeySignature,
  PlanRequiredError,
  initiateUpload,
  finalizeUpload,
  getVideo,
  uploadToPresignedUrl,
};
export type {
  StorageVideo,
  StorageBucket,
  InitiateUploadParams,
  InitiateUploadResult,
  UploadToPresignedUrlParams,
  FinalizeUploadParams,
  GetVideoParams,
  ListVideosParams,
  UploadVideoParams,
} from "./types/index.js";