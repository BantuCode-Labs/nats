import { NextRequest } from "next/server";
import { searchProductBySku } from "@/lib/sku-search";
import { getSession } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const sku = req.nextUrl.searchParams.get("sku");
  if (!sku || !sku.trim()) {
    return new Response(JSON.stringify({ error: "SKU parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await searchProductBySku(sku, (status) => {
          send({ type: "status", message: status });
        });

        send({ type: "result", data: result });
      } catch (error) {
        send({
          type: "result",
          data: {
            success: false,
            error: "Search failed. Please try again.",
          },
        });
      } finally {
        controller.close();
      }
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
