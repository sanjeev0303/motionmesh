import { auth } from "@clerk/nextjs/server";
import { ActivityClient } from "./client-page";

export default async function ActivityPage() {
  const { getToken } = auth();
  const token = await getToken();
  
  let initialVideos = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${apiUrl}/v1/videos`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (response.ok) {
      initialVideos = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch initial videos for activity on server:", error);
  }

  return <ActivityClient initialVideos={Array.isArray(initialVideos) ? initialVideos : []} />;
}
