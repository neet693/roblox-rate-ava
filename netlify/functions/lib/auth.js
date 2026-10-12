import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const COOKIE_NAME = "davetier_admin";
const SESSION_DURATION = 4 * 60 * 60;

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not configured");
  }

  return secret;
}

function sign(value) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function verifyPassword(password) {
  const stored = process.env.ADMIN_PASSWORD_HASH;

  if (!stored || typeof password !== "string") {
    return false;
  }

  const parts = stored.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, expectedHex] = parts;

  if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expectedHex)) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");

  return timingSafeEqual(actual, expected);
}

export function createSessionCookie() {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");

  const token = `${payload}.${sign(payload)}`;

  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION}`;
}

export function hasValidSession(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookie = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${COOKIE_NAME}=`));

    if (!cookie) return false;

    const token = cookie.slice(COOKIE_NAME.length + 1);
    const parts = token.split(".");

    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const expected = Buffer.from(sign(payload), "base64url");
    const actual = Buffer.from(signature, "base64url");

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    return (
      Number.isInteger(session.exp) &&
      session.exp > Math.floor(Date.now() / 1000) &&
      typeof session.nonce === "string"
    );
  } catch {
    return false;
  }
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}
