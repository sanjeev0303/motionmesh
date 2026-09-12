import { getEnvConfig } from "../configs/index.js";
import { parseJsonResponse } from "../utils/parseApiResponse.js";
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

    return parseJsonResponse(response, "Failed to finalize upload");
};