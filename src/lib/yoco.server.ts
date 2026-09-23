import crypto from "node:crypto";
import process from "node:process";

export type YocoCheckoutInput = {
  amount: number;
  reference: string;
  currency?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
  lineItems?: Array<{ name: string; amount: number; quantity?: number }>; 
};

function getServerUrl() {
  return process.env.PUBLIC_SITE_URL || process.env.APP_BASE_URL || "http://localhost:3000";
}

export async function createYocoCheckout(input: YocoCheckoutInput) {
  const secret = process.env.YOCO_SECRET_KEY;
  if (!secret) {
    throw new Error("YOCO_SECRET_KEY is not configured. Add the Yoco test secret in your server environment.");
  }

  const siteUrl = getServerUrl();
  const body = {
    amount: Number(input.amount),
    currency: input.currency || "ZAR",
    reference: input.reference,
    redirectUrl: input.redirectUrl || `${siteUrl}/orders`,
    metadata: input.metadata || {},
    lineItems:
      input.lineItems && input.lineItems.length > 0
        ? input.lineItems.map((item) => ({
            name: item.name,
            amount: Number(item.amount),
            ...(item.quantity ? { quantity: Number(item.quantity) } : {}),
          }))
        : [{ name: "NiberDealz order", amount: Number(input.amount) }],
  };

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || payload?.message || `Yoco checkout request failed (${response.status}).`,
    );
  }

  return payload;
}

export function verifyYocoWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("YOCO_WEBHOOK_SECRET is not configured. Add the Yoco webhook secret in your server environment.");
  }

  const webhookId = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");

  if (!webhookId || !timestamp || !signature) {
    return false;
  }

  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("base64");
  const actual = signature.trim();

  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function normalizeYocoEvent(payload: any) {
  const data = payload?.data ?? payload;
  const eventType = payload?.type ?? payload?.event ?? data?.type ?? data?.event ?? "unknown";
  return {
    eventType,
    checkoutId: data?.checkoutId ?? data?.checkout_id ?? data?.checkout?.id ?? null,
    paymentId: data?.paymentId ?? data?.payment_id ?? data?.payment?.id ?? null,
    reference:
      data?.reference ??
      payload?.reference ??
      data?.metadata?.reference ??
      payload?.metadata?.reference ??
      data?.metadata?.orderId ??
      null,
    amount: data?.amount ?? data?.total_amount ?? data?.total ?? null,
    currency: data?.currency ?? data?.currencyCode ?? "ZAR",
  };
}
