import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { BANK } from "@/lib/bank";

const matches = (given: string, expected: string) =>
  given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/**
 * Expires the cached question bank so the next request reads fresh rows.
 * The import script calls it after writing questions: POST with "Authorization: Bearer $REVALIDATE_SECRET".
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !matches(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidateTag(BANK, { expire: 0 }); // new questions must show on the next request, not after one stale serve
  return Response.json({ revalidated: BANK });
}
