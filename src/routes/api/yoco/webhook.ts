import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

type PaymentAdmin = {
  rpc: (
    functionName: "confirm_yoco_payment",
    args: {
      p_order_id: string;
      p_attempt_id: string;
      p_checkout_id: string;
      p_payment_id: string;
    },
  ) => Promise<{ error: { message?: string } | null }>;
  from: (table: "payment_attempts") => {
    update: (values: { status: string; failure_message: string }) => {
      eq: (
        column: "id" | "provider_checkout_id",
        value: string,
      ) => {
        eq: (
          column: "id" | "provider_checkout_id",
          value: string,
        ) => Promise<{ error: { message?: string } | null }>;
      };
    };
  };
};

function validYocoSignature(rawBody: string, request: Request, secret: string) {
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const header = request.headers.get("webhook-signature") ?? "";
  if (!id || !timestamp || !header || !secret.startsWith("whsec_")) return false;
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 3 * 60 * 1000)
    return false;
  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  return header.split(/\s+/).some((entry) => {
    const value = entry.startsWith("v1,") ? entry.slice(3) : "";
    if (!value) return false;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export const Route = createFileRoute("/api/yoco/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const secret = process.env.YOCO_WEBHOOK_SECRET;
        if (!secret || !validYocoSignature(rawBody, request, secret))
          return Response.json({ error: "Invalid webhook." }, { status: 401 });
        try {
          const event = JSON.parse(rawBody) as Record<string, unknown>;
          const payload = (event.payload ?? event.data ?? event) as Record<string, unknown>;
          const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
          const orderId = typeof metadata.order_id === "string" ? metadata.order_id : null;
          const attemptId =
            typeof metadata.payment_attempt_id === "string" ? metadata.payment_attempt_id : null;
          const checkoutId = typeof payload.id === "string" ? payload.id : null;
          const paymentId = typeof payload.paymentId === "string" ? payload.paymentId : null;
          const status = typeof payload.status === "string" ? payload.status : "";
          if (!orderId || !attemptId || !checkoutId) return Response.json({ received: true });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const paymentAdmin = supabaseAdmin as unknown as PaymentAdmin;
          if (status === "completed" && paymentId) {
            const { error } = await paymentAdmin.rpc("confirm_yoco_payment", {
              p_order_id: orderId,
              p_attempt_id: attemptId,
              p_checkout_id: checkoutId,
              p_payment_id: paymentId,
            });
            if (error) throw new Error(error.message || "Payment confirmation failed.");
          } else if (["cancelled", "failed", "expired"].includes(status)) {
            const { error } = await paymentAdmin
              .from("payment_attempts")
              .update({ status: "failed", failure_message: `Yoco checkout ${status}` })
              .eq("id", attemptId)
              .eq("provider_checkout_id", checkoutId);
            if (error) throw new Error(error.message || "Payment attempt update failed.");
          }
          return Response.json({ received: true });
        } catch (error) {
          console.error(
            "yoco-webhook",
            error instanceof Error ? error.message : "unexpected error",
          );
          return Response.json({ error: "Webhook processing failed." }, { status: 500 });
        }
      },
    },
  },
});
