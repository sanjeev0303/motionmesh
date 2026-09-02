import { auth } from "@clerk/nextjs/server";
import { ApiKeysClient } from "./client-page";

// Server Component: Fetches initial data for SSR
export default async function ApiKeysPage() {
  const { getToken } = auth();
  const token = await getToken();
  
  let initialKeys = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${apiUrl}/v1/api-keys`, {
      headers: { 
        Authorization: `Bearer ${token}` 
      },
      // Next.js caching strategy: revalidate frequently or rely on dynamic
      cache: 'no-store' 
    });

    if (response.ok) {
      initialKeys = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch initial API keys on server:", error);
  }

  return <ApiKeysClient initialKeys={Array.isArray(initialKeys) ? initialKeys : []} />;
}

