import { getDiscordPublicKey, verifyDiscordInteraction } from "@/lib/discord";
import { handleDiscordInteraction } from "@/lib/discord-interactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser checks use GET; Discord verification uses POST with signed payloads. */
export async function GET() {
  const configured = Boolean(getDiscordPublicKey());
  return Response.json({
    ok: configured,
    message: configured
      ? "Discord interactions endpoint is ready for POST requests."
      : "DISCORD_PUBLIC_KEY is not set on this deployment.",
  });
}

export async function POST(request: Request) {
  const publicKey = getDiscordPublicKey();
  if (!publicKey) {
    return new Response("Discord public key is not configured", { status: 503 });
  }

  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp) {
    return new Response("Missing signature", { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifyDiscordInteraction(publicKey, signature, timestamp, rawBody)) {
    return new Response("Invalid request signature", { status: 401 });
  }

  let interaction: unknown;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const response = await handleDiscordInteraction(
    interaction as Parameters<typeof handleDiscordInteraction>[0],
  );

  return Response.json(response);
}
