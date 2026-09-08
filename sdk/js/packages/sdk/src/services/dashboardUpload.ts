import { getEnvConfig } from "../configs/index.js";

export async function dashboardUpload(
    credential: string,
    isBearer: boolean,
    filename: string,
    sizeBytes: number,
    videoFile: File,
    bucketId?: string,
    transcodeBucketId?: string
) {
    const { baseUrl } = getEnvConfig();
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${credential}`
    };

    // Step 1: Initiate
    const initRes = await fetch(`${baseUrl}/videos`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filename,
            size_bytes: sizeBytes,
            bucket_id: bucketId,
            transcode_bucket_id: transcodeBucketId
        })
    });

    if (!initRes.ok) {
        const error = await initRes.text();
        throw new Error(`Failed to initiate upload: ${error}`);
    }

    const initResData = await initRes.json();
    const video = initResData.video;

    // Step 2: Upload file directly to S3 via presigned URL
    // The presigned URL is signed for Content-Type "video/mp4", so that exact
    // header must be sent or S3 rejects the signature.
    const uploadInit: RequestInit & { duplex: "half" } = {
        method: "PUT",
        headers: {
            "Content-Type": "video/mp4",
            "Content-Length": String(videoFile.size),
        },
        body: videoFile,
        // Prevent fetch from chunking — S3 requires exact Content-Length
        // duplex is required for streaming body in Node 18+
        duplex: "half",
    };
    const uploadRes = await fetch(initResData.upload_url, uploadInit);

    if (!uploadRes.ok) {
        const error = await uploadRes.text();
        throw new Error(`Failed to upload file to S3: ${error}`);
    }

    // Step 3: Finalize upload with the backend
    const finalizeRes = await fetch(`${baseUrl}/videos/${video.id}/finalize-upload`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json"
        }
    });

    if (!finalizeRes.ok) {
        const error = await finalizeRes.text();
        throw new Error(`Failed to finalize upload: ${error}`);
    }

    return video;
}
