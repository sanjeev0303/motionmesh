# @motionmesh/sdk

The official JavaScript/TypeScript client for Motionmesh, providing programmatic access to storage and video transcoding services.

## Installation

```bash
npm install @motionmesh/sdk
```

## Quickstart

```javascript
import { motionmesh } from "@motionmesh/sdk";

// Transcode a video
// Important: This should run server-side. Never expose secrets directly in browser code.
const video = await motionmesh.mediaConverter.createJob("vid_123", "https://api.motionmesh.co.in");

// Get playback URL
const playbackInfo = await motionmesh.videos.getPlaybackInfo(video.id, "https://api.motionmesh.co.in");
```

## Documentation

For full API reference, authentication patterns, and advanced usage, visit the [Motionmesh Documentation](https://motionmesh.com/docs) and the [main repository](https://github.com/sanjeev0303/motionmesh).
