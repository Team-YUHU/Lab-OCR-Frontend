// Clerk is disabled for now. To re-enable, restore these two lines and remove the pass-through.
// import { clerkMiddleware } from "@clerk/nextjs/server";
// export default clerkMiddleware();
import { NextResponse } from "next/server";

export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
