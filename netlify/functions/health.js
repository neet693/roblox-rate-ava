export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      service: "DaveTier API",
    }),
    { status: 200, headers },
  );
};
