import { getEnvConfig } from "../configs/index.js";
import { parseJsonResponse } from "../utils/parseApiResponse.js";
import { GetVideoParams, StorageVideo } from "../types/index.js";

export const getVideo = async ({
    credential,
    videoId,
}: GetVideoParams): Promise<StorageVideo> => {
    const { baseUrl } = getEnvConfig();

    const response = await fetch(`${baseUrl}/videos/${videoId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${credential}`,
        },
    });

    return parseJsonResponse(response, "Failed to get the video");
};