import { clearSessionCookie, jsonResponse } from "./lib/auth.js";

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, {
      Allow: "POST",
    });
  }

  return jsonResponse({ success: true, message: "Logout berhasil" }, 200, {
    "Set-Cookie": clearSessionCookie(),
  });
};
