import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard') || 
         pathname.startsWith('/security') || 
         pathname.startsWith('/servers');
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // For now, let the AuthProvider handle authentication
  // In a real implementation, you would check Authelia headers here
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

