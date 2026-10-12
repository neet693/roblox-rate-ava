import { hasValidSession, jsonResponse } from "./lib/auth.js";
import { readAvatars, saveAvatars } from "./lib/github.js";

const ALLOWED_TIERS = ["S", "A", "B", "C", "D", "F", "Unranked"];

export default async (request) => {
  if (request.method !== "PUT") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "PUT" });
  }

  if (!hasValidSession(request)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  try {
    const rawBody = await request.text();

    if (rawBody.length > 20000) {
      return jsonResponse({ error: "Data terlalu besar." }, 413);
    }

    const body = JSON.parse(rawBody);
    const { id } = body;

    if (typeof id !== "string" || !id.trim()) {
      return jsonResponse({ error: "ID avatar wajib diisi." }, 400);
    }

    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const tier = typeof body.tier === "string" ? body.tier.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const rating = Number(body.rating);

    if (!username || username.length > 40) {
      return jsonResponse(
        { error: "Username wajib diisi, maksimal 40 karakter." },
        400,
      );
    }

    if (image.length > 2048 || (image && !/^https:\/\/\S+$/i.test(image))) {
      return jsonResponse(
        { error: "URL gambar harus HTTPS dan maksimal 2048 karakter." },
        400,
      );
    }

    if (!ALLOWED_TIERS.includes(tier)) {
      return jsonResponse({ error: "Tier tidak valid." }, 400);
    }

    if (
      body.rating === "" ||
      body.rating === null ||
      body.rating === undefined ||
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 10
    ) {
      return jsonResponse({ error: "Rating harus antara 0 dan 10." }, 400);
    }

    if (notes.length > 1000) {
      return jsonResponse({ error: "Notes maksimal 1000 karakter." }, 400);
    }

    const { avatars, sha } = await readAvatars();
    const index = avatars.findIndex((avatar) => avatar.id === id);

    if (index === -1) {
      return jsonResponse({ error: "Avatar tidak ditemukan." }, 404);
    }

    const updatedAvatar = {
      ...avatars[index],
      username,
      image,
      tier,
      rating,
      notes,
      updatedAt: new Date().toISOString(),
    };

    avatars[index] = updatedAvatar;

    await saveAvatars(avatars, sha);

    return jsonResponse(
      {
        success: true,
        message: "Avatar berhasil diperbarui.",
        data: updatedAvatar,
      },
      200,
      { "Cache-Control": "no-store" },
    );
  } catch (error) {
    console.error("avatar-update error:", error.message);

    return jsonResponse({ error: "Gagal memperbarui avatar." }, 500);
  }
};
