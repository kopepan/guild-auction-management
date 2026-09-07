import { NextResponse } from "next/server";

import { runPageLoader } from "@/lib/page-loaders/run";
import { timed } from "@/lib/timing";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "/";
  const result = await timed("page", () => runPageLoader(path), { path });

  if ("redirect" in result) {
    return NextResponse.json({ redirect: result.redirect });
  }
  if ("notFound" in result) {
    return NextResponse.json({ notFound: true }, { status: 404 });
  }
  return NextResponse.json({ data: result.data });
}
