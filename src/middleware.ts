// middleware.js
import { type NextRequest, NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación
const publicRoutes = ["/login", "/register", "/forgot-password", "/"];
// Rutas que requieren autenticación
const protectedRoutes = ["/dashboard", "/profile", "/settings", "/admin"];
// Rutas de API que no requieren autenticación (opcional)
const publicApiRoutes = ["/api/auth", "/api/public"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value; // O el nombre de tu cookie/token

  // 1. Verificar si es una ruta pública de API
  if (pathname.startsWith("/api/")) {
    const isPublicApi = publicApiRoutes.some((route) => pathname.startsWith(route));

    if (!isPublicApi && !token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 2. Verificar si está intentando acceder a login/registro teniendo token
  if (token && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
    // Redirigir al dashboard si ya está autenticado
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Verificar si la ruta es protegida y no tiene token
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  const isPublicRoute = publicRoutes.includes(pathname) || publicRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !token && !isPublicRoute) {
    // Redirigir al login con parámetro para volver después
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Permitir acceso a rutas públicas
  return NextResponse.next();
}

// Configuración del middleware
export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * 1. /_next (rutas internas de Next.js)
     * 2. /static (archivos estáticos)
     * 3. /favicon.ico (favicon)
     * 4. /public (carpeta pública)
     * 5. /api/auth (si tienes rutas de autenticación públicas)
     */
    "/((?!_next|static|favicon.ico|public|api/auth).*)",
    // O si quieres ser más específico:
    // '/dashboard/:path*',
    // '/profile/:path*',
    // '/settings/:path*',
    // '/login',
    // '/register',
  ],
};
