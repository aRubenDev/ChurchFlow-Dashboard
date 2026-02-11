// src/app/actions/auth-actions.ts
"use server";

import { cookies } from "next/headers";

import { authentication, createDirectus, readAssetRaw, readMe, rest } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://192.168.1.135:8055";

const directus = createDirectus(DIRECTUS_URL).with(rest()).with(authentication());

// Login y guardar cookies
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("directus_access_token")?.value;

    //await directus.refresh();

    if (accessToken) {
      directus.setToken(accessToken);
    }

    const currentUser = await directus.request(readMe());
    const avatarUrl = currentUser.avatar
      ? `http://192.168.1.135:8055/assets/${currentUser.avatar}?width=100&height=100&fit=cover&format=jpg&access_token=${accessToken}`
      : "";

    // Retorna el formato que espera NavUser
    return {
      name: currentUser.first_name
        ? `${currentUser.first_name} ${currentUser.last_name || ""}`.trim()
        : currentUser.email,
      email: currentUser.email,
      avatar: currentUser.avatar ? avatarUrl : "",
    };
  } catch (error: any) {
    console.error("❌ Error getting the User:", error);
    // Retorna un usuario por defecto en caso de error
    return {
      name: "Usuario",
      email: "sin@email.com",
      avatar: "",
    };
  }
}

export async function getAvatar(id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("directus_access_token")?.value;

    //await directus.refresh();

    if (accessToken) {
      directus.setToken(accessToken);
    }
    const response = await directus.request(
      readAssetRaw(id, {
        format: "jpg",
        width: 100,
        height: 100,
        fit: "cover",
      }),
    );
    console.log("Avatar obtenido:", response);
    return response;
  } catch (error: any) {
    console.error("❌ Error getting the Avatar:", error);
  }
}
