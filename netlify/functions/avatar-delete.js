import { hasValidSession, jsonResponse } from "./lib/auth.js";
import { readAvatars, saveAvatars } from "./lib/github.js";

export default async (request) => {
  if (request.method !== "DELETE") {
    return jsonResponse({ error: "Method not allowed" }, 405, {
      Allow: "DELETE",
    });
  }

  if (!hasValidSession(request)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  try {
    const rawBody = await request.text();

    if (rawBody.length > 2000) {
      return jsonResponse({ error: "Data terlalu besar." }, 413);
    }

    const { id } = JSON.parse(rawBody);

    if (typeof id !== "string" || !id.trim()) {
      return jsonResponse({ error: "ID avatar wajib diisi." }, 400);
    }

    const { avatars, sha } = await readAvatars();
    const index = avatars.findIndex((avatar) => avatar.id === id);

    if (index === -1) {
      return jsonResponse({ error: "Avatar tidak ditemukan." }, 404);
    }

    avatars.splice(index, 1);

    await saveAvatars(avatars, sha);

    return jsonResponse(
      { success: true, message: "Avatar berhasil dihapus." },
      200,
      { "Cache-Control": "no-store" },
    );
  } catch (error) {
    console.error("avatar-delete error:", error.message);

    return jsonResponse({ error: "Gagal menghapus avatar." }, 500);
  }
};
