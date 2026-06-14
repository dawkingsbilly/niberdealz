import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

export interface ProductCardData {
  id: string;
  title: string;
  price_zar: number;
  category: string;
  image_url: string | null;
  vendors?: { business_name: string | null; city: string | null } | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group block rounded-2xl bg-card overflow-hidden border border-border/60 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider">No image</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--deal)] mb-1">{p.category}</div>
        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{p.title}</h3>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="font-display text-xl font-bold text-foreground">R{Number(p.price_zar).toLocaleString("en-ZA")}</span>
        </div>
        {p.vendors && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="truncate">{p.vendors.business_name}</span>
            {p.vendors.city && (<><span>·</span><MapPin className="h-3 w-3" /><span>{p.vendors.city}</span></>)}
          </div>
        )}
      </div>
    </Link>
  );
}
