import { readAvatars } from "./lib/github.js";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

const validImage = (image) =>
  /^https:\/\/\S+$/i.test(image || "") ||
  /^\/\.netlify\/functions\/avatar-image\?file=[a-f0-9-]+\.(png|jpg|webp)$/i.test(
    image || "",
  );

export default async (request) => {
  if (request.method !== "GET") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    console.log("avatar-public-list: mulai membaca data");

    const avatars = await readAvatars();

    console.log(
      "avatar-public-list: hasil readAvatars",
      Array.isArray(avatars) ? `jumlah=${avatars.length}` : "bukan array",
    );

    if (!Array.isArray(avatars)) {
      throw new Error("Invalid avatar data");
    }

    const data = avatars.map((avatar) => ({
      id: String(avatar.id || ""),
      username: String(avatar.username || "Unknown"),
      image: validImage(avatar.image) ? avatar.image : "",
      tier: ["S", "A", "B", "C", "D", "F", "Unranked"].includes(avatar.tier)
        ? avatar.tier
        : "Unranked",
      rating:
        Number.isFinite(Number(avatar.rating)) &&
        Number(avatar.rating) >= 0 &&
        Number(avatar.rating) <= 10
          ? Number(avatar.rating)
          : 0,
      notes: String(avatar.notes || "").slice(0, 1000),
    }));

    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error(
      "avatar-public-list error:",
      error?.message || "Unknown error",
    );

    return jsonResponse({ success: false, error: "Gagal memuat avatar." }, 500);
  }
};
