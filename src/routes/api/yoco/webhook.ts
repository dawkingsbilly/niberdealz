import { createFileRoute } from "@tanstack/react-router";

/**
 * Payment collection is intentionally disabled for the order-request release.
 * This endpoint must not accept or process provider events until a separately
 * reviewed payment integration is implemented and deployed.
 */
export const Route = createFileRoute("/api/yoco/webhook")({
  server: {
    handlers: {
      POST: async () =>
        Response.json({ error: "Payment processing is not available." }, { status: 410 }),
    },
  },
});
