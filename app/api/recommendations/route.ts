import { NextResponse } from "next/server";
import { recommendationsFromLibrary } from "@/lib/kitsu";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = (params.get("ids") || "").split(",").filter(id => /^\d{1,12}$/.test(id)).slice(0, 3);
  if (!ids.length) return NextResponse.json({ items: [], categoryBased: false });
  const items = await recommendationsFromLibrary(ids);
  return NextResponse.json({ items, categoryBased: true }, { headers: { "Cache-Control": "private, max-age=60" } });
}
