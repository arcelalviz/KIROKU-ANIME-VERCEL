import { NextResponse } from "next/server";
import { checkCatalogConnection } from "@/lib/kitsu";

export const dynamic = "force-dynamic";

export async function GET() {
  const check = await checkCatalogConnection();
  return NextResponse.json({
    service: "KIROKU anime catalog",
    checkedAt: new Date().toISOString(),
    ...check,
  }, {
    status: check.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
