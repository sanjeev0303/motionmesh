import { getEnvConfig } from "../configs/index.js";
import { parseJsonResponse } from "../utils/parseApiResponse.js";
import { StorageBucket } from "../types/index.js";

export const listBuckets = async (credential: string): Promise<StorageBucket[]> => {
    const { baseUrl } = getEnvConfig();

    const response = await fetch(`${baseUrl}/buckets`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${credential}`,
        },
    });

    return parseJsonResponse(response, "Failed to list buckets");
};