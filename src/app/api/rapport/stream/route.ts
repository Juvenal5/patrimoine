import { NextRequest } from "next/server";
import { buildOverview } from "@/app/lib/rapports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── GET /api/rapports/stream?periode=... ───────────────────────────────────
// Server-Sent Events : pousse la vue d'ensemble toutes les 15s, et
// immédiatement à la connexion. Rapport.tsx bascule sur du polling toutes
// les 20s si cette connexion échoue.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") || "month";
  const debut = searchParams.get("debut");
  const fin = searchParams.get("fin");

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const envoyer = async () => {
        try {
          const overview = await buildOverview(periode, debut, fin);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(overview)}\n\n`));
        } catch (err) {
          console.error("SSE /api/rapports/stream error:", err);
        }
      };

      await envoyer();
      interval = setInterval(envoyer, 15000);

      req.signal.addEventListener("abort", () => {
        if (interval) clearInterval(interval);
        controller.close();
      });
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}