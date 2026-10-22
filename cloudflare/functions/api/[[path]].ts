// Anything under /api that no route claims is a 404 (not the static site's fallback page).
export const onRequest: PagesFunction = async () => new Response("Not found", { status: 404 });
