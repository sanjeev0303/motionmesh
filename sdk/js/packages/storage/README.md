# @motionmesh/storage

Storage SDK for the Motionmesh API — uploads videos into one bucket for
original files and a second bucket for transcoded material.

## Install

```bash
npm install @motionmesh/storage
```

## Server route setup

Create an API route that proxies requests to the Motionmesh API, then export
`handleProcessRequest` from the `server` entrypoint:

```ts
// app/api/motionmesh/route.ts
import { handleProcessRequest } from "@motionmesh/storage/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") || process.env.MOTIONMESH_API_KEY;
  const credential = apiKey || extractToken(req.headers.get("authorization"));
  if (!credential) {
    return Response.json({ error: "Missing credential" }, { status: 401 });
  }
  const data = await req.formData().catch(() => req.json());
  try {
    return await handleProcessRequest(data, credential);
  } catch (error: any) {
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
```

Set `MOTIONMESH_API_KEY` and, optionally, `MOTIONMESH_BASE_URL` (defaults to
`https://motionmesh.co.in/v1`).

## Browser usage

```ts
import { motionmeshStorage } from "@motionmesh/storage";

// Two-bucket upload through your proxy route
const video = await motionmeshStorage.videos.uploadVideo({
  video: file,
  filename: file.name,
  sizeBytes: file.size,
  bucketId: process.env.NEXT_PUBLIC_MOTIONMESH_BUCKET_ID,
  transcodeBucketId: process.env.NEXT_PUBLIC_MOTIONMESH_TRANSCODE_BUCKET_ID,
});

// Three-step flow: initiate, PUT to the presigned URL, finalize
const initData = await motionmeshStorage.videos.initiateUpload({
  filename: file.name,
  sizeBytes: file.size,
  bucketId,
  transcodeBucketId,
});

// Server-side PUT (browsers cannot send the Content-Length header that S3
// presigned uploads require); the presigned URL is signed for Content-Type
// "video/mp4", so that header is forced on the PUT:
await motionmeshStorage.videos.uploadToPresignedUrl({
  uploadUrl: initData.upload_url,
  file,
});

await motionmeshStorage.videos.finalizeUpload({ videoId: initData.video.id });
```

## Why two buckets

`bucket_id` stores the original uploaded file; `transcode_bucket_id` stores
the transcoded HLS material generated when the upload is finalized. Provide
both to keep originals and transcodes separated.

## Server-side usage

```ts
import { initiateUpload, uploadToPresignedUrl, finalizeUpload, getVideo } from "@motionmesh/storage";
```