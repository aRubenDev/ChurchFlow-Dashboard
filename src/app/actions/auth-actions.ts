// src/app/actions/auth-actions.ts
"use server";

import { cookies } from "next/headers";

import { authentication, createDirectus, readMe, rest } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://192.168.1.135:8055";

const directus = createDirectus(DIRECTUS_URL).with(rest()).with(authentication());

// Login y guardar cookies
export async function loginAction(email: string, password: string) {
  const startTime = Date.now();

  try {
    const response = await directus.login({ email, password });

    console.log("✅ Login response:", response); // Debug: ver qué devuelve

    if (!response.access_token) {
      return { error: "No se recibió token de acceso" };
    }

    const currentUser = await directus.request(readMe());

    const cookieStore = await cookies();

    // ✅ Guardar access token
    cookieStore.set("directus_access_token", response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutos (mismo que ACCESS_TOKEN_TTL)
      path: "/",
    });

    // ✅ Guardar refresh token SI existe
    if (response.refresh_token) {
      console.log("✅ Guardando refresh token");
      cookieStore.set("directus_refresh_token", response.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60, // 7 días
        path: "/",
      });
    } else {
      console.warn("⚠️ No se recibió refresh_token");
    }

    // ✅ Guardar tiempo de expiración
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos
    cookieStore.set("directus_token_expires", expiresAt.toString(), {
      httpOnly: false, // ✅ Necesario para leerlo desde el cliente
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    });

    return {
      success: true,
      user: currentUser,
    };
  } catch (error: any) {
    console.error("❌ Login error:", error);
    return {
      success: false,
      error: error.message || "Error al iniciar sesión",
    };
  }
}

// Logout
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("directus_access_token");
  cookieStore.delete("directus_refresh_token");
}

export async function refreshTokenAction() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("directus_refresh_token")?.value;

    if (!refreshToken) {
      return { error: "No hay refresh token" };
    }

    console.log("🔄 Refrescando token...");

    const directus = createDirectus(DIRECTUS_URL).with(rest()).with(authentication("json"));

    // ✅ Usar el método refresh de Directus
    const response = await directus.refresh({ refresh_token: refreshToken });

    if (!response.access_token) {
      return { error: "No se pudo refrescar el token" };
    }

    console.log("✅ Token refrescado exitosamente");

    // ✅ Actualizar cookies con el nuevo token
    cookieStore.set("directus_access_token", response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    });

    if (response.refresh_token) {
      cookieStore.set("directus_refresh_token", response.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    const expiresAt = Date.now() + 15 * 60 * 1000;
    cookieStore.set("directus_token_expires", expiresAt.toString(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error refrescando token:", error);
    return { error: error.message };
  }
}

export async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("directus_access_token")?.value;
}
