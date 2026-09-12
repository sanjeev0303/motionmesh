import { getEnvConfig } from "../configs/index.js";
import { parseJsonResponse } from "../utils/parseApiResponse.js";
import { ListVideosParams, StorageVideo } from "../types/index.js";

export const listVideos = async ({
    credential,
    externalUserId,
    limit,
    cursor,
}: ListVideosParams): Promise<StorageVideo[]> => {
    const { baseUrl } = getEnvConfig();

    const query = new URLSearchParams();
    if (externalUserId) query.set("external_user_id", externalUserId);
    if (limit) query.set("limit", String(limit));
    if (cursor) query.set("cursor", cursor);
    const queryString = query.toString();

    const response = await fetch(
        `${baseUrl}/videos${queryString ? `?${queryString}` : ""}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${credential}`,
            },
        },
    );

    return parseJsonResponse(response, "Failed to list videos");
};