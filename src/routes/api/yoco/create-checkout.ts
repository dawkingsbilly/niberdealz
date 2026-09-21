import { createFileRoute } from "@tanstack/react-router";

/**
 * Payment collection is intentionally off for the public release.
 * This endpoint is retained so no client can accidentally initiate an unvalidated provider flow.
 */
export const Route = createFileRoute("/api/yoco/create-checkout")({
  server: {
    handlers: {
      POST: async () =>
        Response.json({ error: "Card payments are not available yet." }, { status: 503 }),
    },
  },
});
