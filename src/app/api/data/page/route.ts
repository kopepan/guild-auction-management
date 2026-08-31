import { NextResponse } from "next/server";

import { runPageLoader } from "@/lib/page-loaders/run";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "/";
  const result = await runPageLoader(path);

  if ("redirect" in result) {
    return NextResponse.json({ redirect: result.redirect });
  }
  if ("notFound" in result) {
    return NextResponse.json({ notFound: true }, { status: 404 });
  }
  return NextResponse.json({ data: result.data });
}
