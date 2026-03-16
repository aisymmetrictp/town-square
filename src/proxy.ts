import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isPasswordRoute = createRouteMatcher(["/site-password", "/api/site-password"]);

export default clerkMiddleware(async (auth, request) => {
  // If SITE_PASSWORD is set, gate all routes behind it
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword) {
    // Allow the password page and its API through
    if (isPasswordRoute(request)) {
      return NextResponse.next();
    }

    // Check for the access cookie
    const accessCookie = request.cookies.get("site_access");
    if (accessCookie?.value !== "granted") {
      return NextResponse.redirect(new URL("/site-password", request.url));
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
