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
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      console.error("GitHub image fetch failed:", response.status);
      return new Response("Image not found or GitHub API error", {
        status: response.status === 404 ? 404 : 502,
      });
    }

    const data = await response.json();

    if (!data.content || data.encoding !== "base64") {
      console.error("Unexpected GitHub image response");
      return new Response("Invalid image data from GitHub", {
        status: 502,
      });
    }

    const buffer = Buffer.from(data.content.replace(/\s/g, ""), "base64");

    const extension = filename.split(".").pop().toLowerCase();
    const mimeTypes = {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
    };

    const contentType = mimeTypes[extension];

    if (!buffer.length) {
      return new Response("Empty image", { status: 502 });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("avatar-image error:", error.message);
    return new Response("Unable to load image", { status: 500 });
  }
};
