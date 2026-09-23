import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CustomerOrderItem = {
  id: string;
  product_id: string | null;
  title: string;
  unit_price_zar: number;
  qty: number;
  size: string | null;
  color: string | null;
  comment: string;
  image_url: string | null;
};

export type CustomerOrder = {
  id: string;
  reference: string;
  created_at: string;
  status: string;
  delivery_method: string;
  delivery_days: number | null;
  delivery_tier: string | null;
  paxi_pickup_point: string;
  delivery_address: string;
  delivery_fee_zar: number;
  subtotal_zar: number;
  discount_zar: number;
  total_zar: number;
  coupon_code: string | null;
  order_items: CustomerOrderItem[] | null;
};

type CustomerOrdersClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: CustomerOrder[] | null; error: { message: string } | null }>;
      };
    };
  };
};

/**
 * Customer order-request history. The active checkout is createNiberDealzOrder in
 * ecommerce.functions.ts; catalogue pricing, fulfilment and payment collection are not handled here.
 */
export const listMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // The generated database types predate the single-store order-request schema.
    // Keep the narrow runtime shape here until they can be safely regenerated from production.
    const db = context.supabase as unknown as CustomerOrdersClient;
    const { data, error } = await db
      .from("orders")
      .select(
        "id,reference,created_at,status,delivery_method,delivery_days,delivery_tier,paxi_pickup_point,delivery_address,delivery_fee_zar,subtotal_zar,discount_zar,total_zar,coupon_code,order_items(id,product_id,title,unit_price_zar,qty,size,color,comment,image_url)",
      )
      .eq("buyer_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Unable to load your order requests.");
    return data ?? [];
  });
