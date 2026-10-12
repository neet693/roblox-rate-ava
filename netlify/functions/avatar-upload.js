import { hasValidSession, jsonResponse } from "./lib/auth.js";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 2 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, {
      Allow: "POST",
    });
  }

  if (!hasValidSession(request)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  try {
    const rawBody = await request.text();

    if (rawBody.length > 3_000_000) {
      return jsonResponse({ error: "File terlalu besar." }, 413);
    }

    const { image, mimeType } = JSON.parse(rawBody);

    if (!MIME_EXTENSIONS[mimeType]) {
      return jsonResponse({ error: "Format harus PNG, JPG, atau WebP." }, 400);
    }

    if (typeof image !== "string") {
      return jsonResponse({ error: "File gambar tidak valid." }, 400);
    }

    const base64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

    if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      return jsonResponse({ error: "Data gambar tidak valid." }, 400);
    }

    const buffer = Buffer.from(base64, "base64");

    if (!buffer.length || buffer.length > MAX_SIZE) {
      return jsonResponse({ error: "Ukuran gambar maksimal 2 MB." }, 400);
    }

    const signatures = {
      "image/png": buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      "image/jpeg":
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
      "image/webp":
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP",
    };

    if (!signatures[mimeType]) {
      return jsonResponse(
        { error: "Isi file tidak cocok dengan format gambar." },
        400,
      );
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

    if (!token || !repo) {
      throw new Error("Konfigurasi GitHub belum lengkap.");
    }

    const filename = `${randomUUID()}.${MIME_EXTENSIONS[mimeType]}`;
    const path = `images/${filename}`;

    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Upload DaveTier avatar image",
          content: buffer.toString("base64"),
          branch: "main",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("GitHub upload error:", response.status, error.message);
      throw new Error("GitHub gagal menyimpan gambar.");
    }

    return jsonResponse({
      success: true,
      image: `/.netlify/functions/avatar-image?file=${filename}`,
      message: "Gambar berhasil diunggah.",
    });
  } catch (error) {
    console.error("avatar-upload error:", error.message);
    return jsonResponse(
      {
        error:
          error.message === "GitHub gagal menyimpan gambar."
            ? error.message
            : "Gagal mengunggah gambar.",
      },
      500,
    );
  }
};
