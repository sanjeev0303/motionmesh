import { getEnvConfig } from "../configs/index.js";
import { StorageBucket } from "../types/index.js";

export const listBuckets = async (credential: string): Promise<StorageBucket[]> => {
    const { baseUrl } = getEnvConfig();

    const response = await fetch(`${baseUrl}/buckets`, {
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
                : data?.message || data?.error || "Failed to list buckets";
        throw new Error(msg);
    }

    return data;
};