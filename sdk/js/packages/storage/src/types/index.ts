export interface StorageVideo {
    id: string;
    account_id: string;
    bucket_id: string;
    transcode_bucket_id: string | null;
    object_key: string;
    thumbnail_key: string | null;
    sprite_key: string | null;
    preview_key: string | null;
    title: string;
    status: "queued" | "processing" | "ready" | "failed";
    captions_status: string;
    duration: number;
    size_bytes: number;
    external_user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface StorageBucket {
    id: string;
    name: string;
    account_id: string;
    region?: string;
    storage_used_bytes?: number;
    object_count?: number;
    storage_limit_bytes?: number;
    egress_limit_bytes?: number;
    status?: string;
    created_at?: string;
}

export interface InitiateUploadParams {
    credential: string;
    filename: string;
    sizeBytes: number;
    bucketId?: string;
    transcodeBucketId?: string;
    externalUserId?: string;
}

export interface InitiateUploadResult {
    video: StorageVideo;
    upload_url: string;
    object_key: string;
}

export interface UploadToPresignedUrlParams {
    uploadUrl: string;
    file: File | Blob | Buffer | Uint8Array;
    contentType?: string;
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
}

export interface FinalizeUploadParams {
    credential: string;
    videoId: string;
}

export interface GetVideoParams {
    credential: string;
    videoId: string;
}

export interface ListVideosParams {
    credential: string;
    externalUserId?: string;
    limit?: number;
    cursor?: string;
}

export interface UploadVideoParams {
    credential: string;
    filename: string;
    sizeBytes: number;
    videoFile: File | Blob | Buffer | Uint8Array;
    bucketId?: string;
    transcodeBucketId?: string;
    externalUserId?: string;
    onProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
}