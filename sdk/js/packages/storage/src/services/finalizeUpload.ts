import { getEnvConfig } from "../configs/index.js";
import { FinalizeUploadParams } from "../types/index.js";

export const finalizeUpload = async ({
    credential,
    videoId,
}: FinalizeUploadParams): Promise<{ status: string }> => {
    const { baseUrl } = getEnvConfig();

    const response = await fetch(`${baseUrl}/videos/${videoId}/finalize-upload`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${credential}`,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        const msg =
            Array.isArray(data?.message)
                ? data.message.join(", ")
                : data?.message || data?.error || "Failed to finalize upload";
        throw new Error(msg);
    }

    return data;
};