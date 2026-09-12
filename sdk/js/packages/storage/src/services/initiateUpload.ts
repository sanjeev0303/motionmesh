import { getEnvConfig } from "../configs/index.js";
import { parseJsonResponse } from "../utils/parseApiResponse.js";
import { InitiateUploadParams, InitiateUploadResult } from "../types/index.js";

export const initiateUpload = async ({
    credential,
    filename,
    sizeBytes,
    bucketId,
    transcodeBucketId,
    externalUserId,
}: InitiateUploadParams): Promise<InitiateUploadResult> => {
    const { baseUrl } = getEnvConfig();

    const response = await fetch(`${baseUrl}/videos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${credential}`,
        },
        body: JSON.stringify({
            filename,
            size_bytes: sizeBytes,
            bucket_id: bucketId,
            transcode_bucket_id: transcodeBucketId,
            external_user_id: externalUserId,
        }),
    });

    return parseJsonResponse(response, "Failed to initiate upload");
};