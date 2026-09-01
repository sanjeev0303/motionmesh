import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextFetchEvent, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)'
]);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    console.error("Missing Clerk environment variables");
    return NextResponse.next();
  }
  return clerkMiddleware((auth, req) => {
    if (isProtectedRoute(req)) {
      auth().protect();
    }
  })(request, event);
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
