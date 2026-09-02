import { auth } from "@clerk/nextjs/server";
import { BucketsClient } from "./client-page";

export default async function BucketsPage() {
  const { getToken } = auth();
  const token = await getToken();
  
  let initialBuckets = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${apiUrl}/v1/buckets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (response.ok) {
      initialBuckets = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch initial buckets on server:", error);
  }

  return <BucketsClient initialBuckets={Array.isArray(initialBuckets) ? initialBuckets : []} />;
}
