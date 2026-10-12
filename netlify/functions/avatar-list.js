import { hasValidSession, jsonResponse } from "./lib/auth.js";
import { readAvatars } from "./lib/github.js";

export default async (request) => {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }

  if (!hasValidSession(request)) {
    return jsonResponse({ error: "Unauthorized. Silakan login kembali." }, 401);
  }

  try {
    const { avatars } = await readAvatars();

    return jsonResponse({ success: true, data: avatars }, 200, {
      "Cache-Control": "no-store",
    });
  } catch (error) {
    console.error("avatar-list error:", error.message);

    return jsonResponse({ error: "Gagal mengambil data avatar." }, 500);
  }
};
