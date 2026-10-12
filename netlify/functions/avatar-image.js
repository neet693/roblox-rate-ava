export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const url = new URL(request.url);
  const filename = url.searchParams.get("file");

  if (!filename || !/^[a-f0-9-]+\.(png|jpg|webp)$/i.test(filename)) {
    return new Response("Invalid image filename", { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return new Response("Storage configuration error", { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/images/${filename}`,
      {
        headers: {
          Accept: "application/vnd.github.raw+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      return new Response("Image not found", {
        status: response.status === 404 ? 404 : 502,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(contentType.split(";")[0])) {
      return new Response("Invalid image type", { status: 415 });
    }

    return new Response(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0],
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Unable to load image", { status: 500 });
  }
};
