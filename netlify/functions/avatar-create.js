import { hasValidSession, jsonResponse } from "./lib/auth.js";
import { readAvatars, saveAvatars } from "./lib/github.js";
import { randomUUID } from "node:crypto";

const ALLOWED_TIERS = ["S", "A", "B", "C", "D", "F", "Unranked"];

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, {
      Allow: "POST",
    });
  }

  if (!hasValidSession(request)) {
    return jsonResponse({ error: "Unauthorized. Silakan login kembali." }, 401);
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return jsonResponse(
        { error: "Content-Type harus application/json." },
        415,
      );
    }

    const rawBody = await request.text();

    if (rawBody.length > 20000) {
      return jsonResponse({ error: "Data terlalu besar." }, 413);
    }

    const body = JSON.parse(rawBody);

    const username =
      typeof body.username === "string" ? body.username.trim() : "";

    const image = typeof body.image === "string" ? body.image.trim() : "";

    const tier = typeof body.tier === "string" ? body.tier.trim() : "";

    const rating = Number(body.rating);

    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!username || username.length > 40) {
      return jsonResponse(
        { error: "Username wajib diisi, maksimal 40 karakter." },
        400,
      );
    }

    if (image.length > 2048) {
      return jsonResponse({ error: "URL gambar terlalu panjang." }, 400);
    }

    if (image && !/^https:\/\/\S+$/i.test(image)) {
      return jsonResponse(
        { error: "Gambar harus menggunakan URL HTTPS." },
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
      return jsonResponse(
        { error: "Rating harus berupa angka antara 0 dan 10." },
        400,
      );
    }

    if (notes.length > 1000) {
      return jsonResponse({ error: "Notes maksimal 1000 karakter." }, 400);
    }

    const { avatars, sha } = await readAvatars();

    const avatar = {
      id: randomUUID(),
      username,
      image,
      tier,
      rating,
      notes,
      createdAt: new Date().toISOString(),
    };

    avatars.push(avatar);

    await saveAvatars(avatars, sha);

    return jsonResponse(
      { success: true, message: "Avatar berhasil ditambahkan.", data: avatar },
      201,
      { "Cache-Control": "no-store" },
    );
  } catch (error) {
    console.error("avatar-create error:", error.message);

    return jsonResponse({ error: "Gagal menyimpan avatar ke GitHub." }, 500);
  }
};
