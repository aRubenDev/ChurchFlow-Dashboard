// middleware.js
import { type NextRequest, NextResponse } from "next/server";

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ["/auth/v1/login", "/auth/v1/register", "/auth/v1/forgot-password"];

// Rutas que SÍ requieren autenticación
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/settings", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("directus_access_token")?.value;
  const refreshToken = request.cookies.get("directus_refresh_token")?.value;
  const expiresAt = request.cookies.get("directus_token_expires")?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // ✅ Si el token está próximo a expirar (menos de 5 minutos), refrescar
  const shouldRefresh = expiresAt && parseInt(expiresAt) - Date.now() < 5 * 60 * 1000;

  if (isProtectedRoute) {
    // Sin token → redirect a login
    if (!token) {
      const loginUrl = new URL("/auth/v1/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Token próximo a expirar → intentar refresh
    if (shouldRefresh && refreshToken) {
      console.log("🔄 Token próximo a expirar, refrescando...");

      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            mode: "json",
          }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();

          const response = NextResponse.next();

          // ✅ Actualizar cookies con nuevos tokens
          response.cookies.set("directus_access_token", data.data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60,
            path: "/",
          });

          if (data.data.refresh_token) {
            response.cookies.set("directus_refresh_token", data.data.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              maxAge: 7 * 24 * 60 * 60,
              path: "/",
            });
          }

          const newExpiresAt = Date.now() + 15 * 60 * 1000;
          response.cookies.set("directus_token_expires", newExpiresAt.toString(), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60,
            path: "/",
          });

          console.log("✅ Token refrescado en middleware");
          return response;
        }
        // Refresh falló → redirect a login
        console.log("❌ Refresh falló, redirigiendo a login");
        const loginUrl = new URL("/auth/v1/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      } catch (error) {
        console.error("Error refrescando token:", error);
      }
    }
  }

  // Usuario autenticado en ruta pública
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL("/dashboard/default", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*", "/dashboard/:path*", "/profile/:path*", "/settings/:path*", "/admin/:path*", "/auth/:path*"],
};
