import { getEnvConfig } from "../configs/index.js";
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

    const data = await response.json();

    if (!response.ok) {
        const msg =
            Array.isArray(data?.message)
                ? data.message.join(", ")
                : data?.message || data?.error || "Failed to initiate upload";
        throw new Error(msg);
    }

    return data;
};