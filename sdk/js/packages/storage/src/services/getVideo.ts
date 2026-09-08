import { getEnvConfig } from "../configs/index.js";
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

    const data = await response.json();

    if (!response.ok) {
        const msg =
            Array.isArray(data?.message)
                ? data.message.join(", ")
                : data?.message || data?.error || "Failed to get the video";
        throw new Error(msg);
    }

    return data;
};