import { auth } from "@clerk/nextjs/server";
import DashboardClient from "./client-page";

export default async function DashboardHome() {
  const { getToken } = auth();
  const token = await getToken();
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const fetchOpts = {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store' as RequestCache
  };

  // Fetch initial data in parallel
  const [bucketsRes, apiKeysRes, subRes] = await Promise.all([
    fetch(`${apiUrl}/v1/buckets`, fetchOpts).catch(() => null),
    fetch(`${apiUrl}/v1/api-keys`, fetchOpts).catch(() => null),
    fetch(`${apiUrl}/v1/billing/subscription`, fetchOpts).catch(() => null)
  ]);

  const initialBuckets = bucketsRes?.ok ? await bucketsRes.json() : [];
  const initialApiKeys = apiKeysRes?.ok ? await apiKeysRes.json() : [];
  const initialSubscription = subRes?.ok ? await subRes.json() : null;

  return (
    <DashboardClient 
      initialBuckets={Array.isArray(initialBuckets) ? initialBuckets : []}
      initialApiKeys={Array.isArray(initialApiKeys) ? initialApiKeys : []}
      initialSubscription={initialSubscription}
    />
  );
}
