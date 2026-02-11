"use server";

import { cookies } from "next/headers";

import { authentication, createDirectus, readMe, rest } from "@directus/sdk";

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://192.168.1.135:8055";

export const directus = createDirectus(directusUrl).with(authentication("json")).with(rest());

// Login usando fetch directo (evita el bug del SDK)
export async function loginDirectus(email, password) {
  try {
    const response = await directus.login({ email, password });

    if (!response.access_token) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.message || "Login failed");
    }

    // 3. Guardar tokens en cookies
    const cookieStore = await cookies();

    cookieStore.set("directus_access_token", response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    if (response.refresh_token) {
      cookieStore.set("directus_refresh_token", response.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    console.log("✅ Cookies guardadas");

    return {
      success: true,
      tokens: {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
}

// Obtener items de una colección (autenticado)
export async function getItems(collection, query = {}) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("directus_token") : null;

    if (!token) {
      throw new Error("No authentication token found. Please login first.");
    }

    let url = `${directusUrl}/items/${collection}`;

    // Añadir query params si existen
    if (Object.keys(query).length > 0) {
      const params = new URLSearchParams();

      if (query.filter) {
        params.append("filter", JSON.stringify(query.filter));
      }
      if (query.fields) {
        params.append("fields", query.fields.join(","));
      }
      if (query.limit) {
        params.append("limit", query.limit.toString());
      }
      if (query.sort) {
        params.append("sort", query.sort.join(","));
      }

      url += "?" + params.toString();
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.message || "Failed to fetch items");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error getting items:", error);
    return { success: false, error: error.message };
  }
}

// Crear item
export async function createItemDirectus(collection, itemData) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("directus_token") : null;

    if (!token) {
      throw new Error("No authentication token found. Please login first.");
    }

    const response = await fetch(`${directusUrl}/items/${collection}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.message || "Failed to create item");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error creating item:", error);
    return { success: false, error: error.message };
  }
}

// Actualizar item
export async function updateItemDirectus(collection, id, itemData) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("directus_token") : null;

    if (!token) {
      throw new Error("No authentication token found. Please login first.");
    }

    const response = await fetch(`${directusUrl}/items/${collection}/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.message || "Failed to update item");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error updating item:", error);
    return { success: false, error: error.message };
  }
}

// Eliminar item
export async function deleteItemDirectus(collection, id) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("directus_token") : null;

    if (!token) {
      throw new Error("No authentication token found. Please login first.");
    }

    const response = await fetch(`${directusUrl}/items/${collection}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.message || "Failed to delete item");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    return { success: false, error: error.message };
  }
}

// Logout
export async function logoutDirectus() {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("directus_token") : null;

    if (token) {
      // Intentar logout en servidor (opcional, no crítico)
      await fetch(`${directusUrl}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {
        // Ignorar errores de logout en servidor
      });
    }

    // Limpiar tokens locales
    if (typeof window !== "undefined") {
      localStorage.removeItem("directus_token");
      localStorage.removeItem("directus_refresh_token");
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verificar si hay sesión activa
export async function hasActiveSession() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("directus_token");
}

// Obtener usuario actual
export async function getCurrentUser() {
  try {
    const token = await directus.getToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await directus.request("/users/me");

    console.log("Current user response:", response);

    if (!response.ok) {
      throw new Error("Failed to get current user");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
