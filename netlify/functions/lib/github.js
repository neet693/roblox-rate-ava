const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = "main";
const DATA_PATH = "data/avatars.json";

async function githubRequest(path, options = {}) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    throw new Error("Konfigurasi GitHub belum lengkap.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    },
  );

  return response;
}

export async function readAvatars() {
  const response = await githubRequest(DATA_PATH, {
    method: "GET",
  });

  if (response.status === 404) {
    return { avatars: [], sha: null };
  }

  if (!response.ok) {
    throw new Error(`GitHub gagal membaca data (${response.status}).`);
  }

  const file = await response.json();
  const content = Buffer.from(file.content, "base64").toString("utf8");

  return {
    avatars: JSON.parse(content),
    sha: file.sha,
  };
}

export async function saveAvatars(avatars, sha) {
  const content = Buffer.from(
    JSON.stringify(avatars, null, 2),
    "utf8",
  ).toString("base64");

  const response = await githubRequest(DATA_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Update DaveTier avatar data",
      content,
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      `GitHub gagal menyimpan data (${response.status}): ${
        error.message || "Unknown error"
      }`,
    );
  }

  return response.json();
}
