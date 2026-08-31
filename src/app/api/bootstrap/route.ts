import { NextResponse } from "next/server";

import { loadBootstrap } from "@/lib/page-loaders/bootstrap";

export async function GET() {
  const data = await loadBootstrap();
  return NextResponse.json(data);
}
