import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/subscriptions(.*)',
  '/api/analytics(.*)',
  '/api/ai-insights(.*)',
  '/api/ai-chat(.*)',
  '/api/notifications(.*)',
  '/api/user(.*)',
  '/api/transactions(.*)',
  '/api/plaid(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard and API routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

