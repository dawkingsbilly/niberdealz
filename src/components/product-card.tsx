import { Link } from "@tanstack/react-router";
import { Star, Truck } from "lucide-react";
import { deliverySummary, parseDeliveryOptions } from "@/lib/affiliate";


export interface ProductCardData {
  id: string;
  title: string;
  price_zar: number;
  category: string;
  image_url: string | null;
  stock?: number | null;
  is_sold?: boolean | null;
  discount_pct?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
  delivery_options?: unknown;
  vendors?: {
    business_name: string | null;
    city: string | null;
    verified?: boolean | null;
    is_official?: boolean | null;
  } | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const discount = p.discount_pct ?? 0;
  const salePrice = discount > 0 ? Math.round(Number(p.price_zar) * (100 - discount)) / 100 : null;
  const soldOut = p.is_sold || p.stock === 0;
  const delivery = deliverySummary(parseDeliveryOptions(p.delivery_options));

  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group relative block rounded-2xl bg-card overflow-hidden border border-border/60 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-square bg-muted overflow-hidden relative">
        {p.image_url ? (
          <img src={p.image_url} alt={`Product: ${p.title}`} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider">No image</div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-md bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1">
            -{discount}% SALE
          </span>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1">
              {p.is_sold ? "Sold" : "Sold out"}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--deal)] mb-1">{p.category}</div>
        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{p.title}</h3>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          {salePrice !== null ? (
            <>
              <span className="font-display text-xl font-bold text-destructive">R{salePrice.toLocaleString("en-ZA")}</span>
              <span className="text-xs text-muted-foreground line-through">R{Number(p.price_zar).toLocaleString("en-ZA")}</span>
            </>
          ) : (
            <span className="font-display text-xl font-bold text-foreground">R{Number(p.price_zar).toLocaleString("en-ZA")}</span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-3 text-xs">
          {(p.avg_rating ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <strong>{(p.avg_rating ?? 0).toFixed(1)}</strong>
              <span className="text-muted-foreground">({p.review_count ?? 0})</span>
            </span>
          )}
          {typeof p.stock === "number" && p.stock > 0 && p.stock <= 5 && (
            <span className="text-destructive font-medium">Only {p.stock} left</span>
          )}
          {typeof p.stock === "number" && p.stock > 5 && (
            <span className="text-muted-foreground">{p.stock} available</span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-3 w-3" />
          <span className="truncate">{delivery}</span>
        </div>


      </div>
    </Link>
  );
}
