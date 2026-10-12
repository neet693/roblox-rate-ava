import { hasValidSession, jsonResponse } from "./lib/auth.js";

export default async (request) => {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }

  try {
    const authenticated = hasValidSession(request);

    return jsonResponse({
      authenticated,
    });
  } catch {
    return jsonResponse({ error: "Server error" }, 500);
  }
};
