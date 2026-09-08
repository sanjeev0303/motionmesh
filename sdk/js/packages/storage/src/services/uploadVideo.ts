import { initiateUpload } from "./initiateUpload.js";
import { uploadToPresignedUrl } from "./uploadToPresignedUrl.js";
import { finalizeUpload } from "./finalizeUpload.js";
import { StorageVideo, UploadVideoParams } from "../types/index.js";

export const uploadVideo = async ({
    credential,
    filename,
    sizeBytes,
    videoFile,
    bucketId,
    transcodeBucketId,
    externalUserId,
    onProgress,
}: UploadVideoParams): Promise<StorageVideo> => {
    const initData = await initiateUpload({
        credential,
        filename,
        sizeBytes,
        bucketId,
        transcodeBucketId,
        externalUserId,
    });

    onProgress?.({ loaded: 0, total: sizeBytes, percent: 0 });

    await uploadToPresignedUrl({
        uploadUrl: initData.upload_url,
        file: videoFile,
        onProgress,
    });

    await finalizeUpload({ credential, videoId: initData.video.id });

    return initData.video;
};