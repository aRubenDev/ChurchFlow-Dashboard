// src/hooks/use-token-refresh.ts
"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { refreshTokenAction } from "@/app/actions/auth-actions";

export function useTokenRefresh() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Verificar cada minuto si el token necesita refresh
    const interval = setInterval(async () => {
      const expiresAtCookie = document.cookie.split("; ").find((row) => row.startsWith("directus_token_expires="));

      if (!expiresAtCookie) return;

      const expiresAt = parseInt(expiresAtCookie.split("=")[1]);
      const timeLeft = expiresAt - Date.now();

      // ✅ Si quedan menos de 5 minutos, refrescar
      if (timeLeft < 5 * 60 * 1000 && timeLeft > 0) {
        console.log("🔄 Refrescando token automáticamente...");
        const result = await refreshTokenAction();

        if (result.error) {
          console.error("❌ Error refrescando token:", result.error);
          router.push("/auth/v1/login");
        } else {
          console.log("✅ Token refrescado");
          router.refresh(); // Refrescar la página para obtener nuevos datos
        }
      }
    }, 60 * 1000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [router]);
}
