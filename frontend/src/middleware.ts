import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/security(.*)',
  '/servers(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // Temporarily disable authentication for testing
  // TODO: Re-enable after fixing Clerk keys
  // if (isProtectedRoute(req)) {
  //   auth.protect();
  // }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

