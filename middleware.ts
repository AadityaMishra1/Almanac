export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/calendar/:path*",
    "/api/parse/:path*",
    "/api/chat/:path*",
    "/api/account/:path*",
  ],
};
