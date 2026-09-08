export interface FileMeta {
    filename: string;
    contentType: string;
    size: number;
}

export const extractFileMeta = (file: File | Blob | Buffer | Uint8Array): FileMeta => {
    if (file instanceof File) {
        return {
            filename: file.name,
            contentType: file.type || "video/mp4",
            size: file.size,
        };
    }
    if (file instanceof Blob) {
        return {
            filename: "upload",
            contentType: "video/mp4",
            size: file.size,
        };
    }
    return {
        filename: "upload",
        contentType: "video/mp4",
        size: file.byteLength,
    };
};