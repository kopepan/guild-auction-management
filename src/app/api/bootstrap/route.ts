import { NextResponse } from "next/server";

import { loadBootstrap } from "@/lib/page-loaders/bootstrap";
import { timed } from "@/lib/timing";

export async function GET() {
  const data = await timed("bootstrap", () => loadBootstrap());
  return NextResponse.json(data);
}
