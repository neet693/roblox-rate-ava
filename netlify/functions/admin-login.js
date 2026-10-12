import {
  verifyPassword,
  createSessionCookie,
  jsonResponse,
} from "./lib/auth.js";

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, {
      Allow: "POST",
    });
  }

  let body;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return jsonResponse({ error: "Invalid content type" }, 415);
    }

    const rawBody = await request.text();

    if (rawBody.length > 4096) {
      return jsonResponse({ error: "Request too large" }, 413);
    }

    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  if (!verifyPassword(body?.password)) {
    return jsonResponse({ error: "Password salah" }, 401);
  }

  try {
    return jsonResponse({ success: true, message: "Login berhasil" }, 200, {
      "Set-Cookie": createSessionCookie(),
    });
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }
};
