import { UploadToPresignedUrlParams } from "../types/index.js";

export const uploadToPresignedUrl = async ({
    uploadUrl,
    file,
    contentType = "video/mp4",
    onProgress,
}: UploadToPresignedUrlParams): Promise<void> => {
    const headers: Record<string, string> = {
        "Content-Type": contentType,
    };

    if (typeof Buffer !== "undefined" && file instanceof Buffer) {
        headers["Content-Length"] = String(file.byteLength);
    } else if (file instanceof Uint8Array) {
        headers["Content-Length"] = String(file.byteLength);
    }

    const totalBytes = file instanceof Uint8Array ? file.byteLength : file.size;

    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: file as BodyInit,
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        const msg = text || response.statusText || "Failed to upload the file";
        throw new Error(`[Motionmesh] Upload failed: ${msg}`);
    }

    onProgress?.({ loaded: totalBytes, total: totalBytes, percent: 100 });
};