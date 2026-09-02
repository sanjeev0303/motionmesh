import { motionmesh } from "@motionmesh/sdk";
import { MediaConvertClient } from "./client-page";

export default async function MediaConvertPage() {
  let initialJobs = [];
  try {
    const result = await motionmesh.mediaConverter.listJobs(50);
    if (result) {
      initialJobs = result as any;
    }
  } catch (error) {
    console.error("Failed to fetch initial transcode jobs on server:", error);
  }

  return <MediaConvertClient initialJobs={Array.isArray(initialJobs) ? initialJobs : []} />;
}
