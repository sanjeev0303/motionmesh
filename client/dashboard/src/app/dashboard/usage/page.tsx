import { auth } from "@clerk/nextjs/server";
import { UsageClient } from "./client-page";

export default async function UsagePage() {
  const { getToken } = auth();
  const token = await getToken();
  
  let initialSubscription = null;
  let initialInvoices = [];
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    const [subRes, invRes] = await Promise.all([
      fetch(`${apiUrl}/v1/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`${apiUrl}/v1/billing/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
    ]);

    if (subRes.ok) {
      initialSubscription = await subRes.json();
    }
    if (invRes.ok) {
      initialInvoices = await invRes.json();
    }
  } catch (error) {
    console.error("Failed to fetch initial usage data on server:", error);
  }

  return (
    <UsageClient 
      initialSubscription={initialSubscription} 
      initialInvoices={Array.isArray(initialInvoices) ? initialInvoices : []} 
    />
  );
}
