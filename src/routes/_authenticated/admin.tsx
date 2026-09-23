/* eslint-disable @typescript-eslint/no-explicit-any -- Server-function response shapes are progressively narrowed at their use sites. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Check,
  Clipboard,
  Crown,
  Eye,
  Loader2,
  PackageCheck,
  Upload,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import {
  deleteProduct,
  grantAdministratorByEmail,
  listAdminDirectory,
  listFulfilmentQueue,
  manageAdministrator,
  saveProduct,
  updateManualFulfilment,
  updateOrderFulfillment,
  listCatalogueOperations,
  listSupplierConnections,
  reviewImportedProduct,
  saveSupplierConnection,
  stageSupplierImport,
} from "@/lib/ecommerce.functions";
import { ProductImageUploader } from "@/components/product-image-uploader";
import { suggestProductCopy } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });
type Tab = "analytics" | "catalogue" | "products" | "fulfilment" | "admins";

function Admin() {
  const { roles, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("analytics");
  const isCEO = roles.includes("owner");
  const isAdmin = roles.includes("admin");
  if (isLoading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!isCEO && !isAdmin)
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-20 text-center">
          <ShieldCheck className="mx-auto h-8 w-8" />
          <h1 className="mt-4 font-display text-2xl font-bold">Access restricted</h1>
          <p className="mt-2 text-muted-foreground">
            This area is for authorised NiberDealz staff only.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  const tabs: { id: Tab; label: string }[] = [
    { id: "analytics", label: "Overview" },
    { id: "catalogue", label: "Supplier imports" },
    { id: "products", label: "Products" },
    { id: "fulfilment", label: "Fulfilment" },
    { id: "admins", label: "Admins" },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl flex-1 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
              {isCEO ? <Crown /> : <ShieldCheck />}
              {isCEO ? "CEO control centre" : "Admin workspace"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isCEO
                ? "Review supplier imports, approve catalogue changes and run fulfilment."
                : "Your role has no access to money, payments, customer details, CEO details or staff management."}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">View store</Link>
          </Button>
        </div>
        {isCEO ? (
          <>
            <nav className="mt-8 flex gap-2 overflow-x-auto border-b">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.id ? "border-foreground" : "border-transparent text-muted-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {tab === "analytics" && <Analytics />}
            {tab === "catalogue" && <CatalogueOperations />}
            {tab === "products" && <Products />}
            {tab === "fulfilment" && <Fulfilment />}
            {tab === "admins" && <Admins />}
          </>
        ) : (
          <div className="mt-10 rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Limited access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing sensitive is available in this workspace. Contact the CEO if you need a task
              assigned.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["ceo-analytics"],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * 86400000).toISOString();
      const [events, orders] = await Promise.all([
        supabase.from("product_events").select("event_type").gte("created_at", since).limit(10000),
        supabase.from("orders").select("total_zar").gte("created_at", since),
      ]);
      if (orders.error) throw orders.error;
      return {
        views: (events.data ?? []).filter((e: any) => e.event_type === "view").length,
        orders: orders.data ?? [],
      };
    },
  });
  const sales = useMemo(
    () =>
      data?.orders.reduce((sum: number, order: any) => sum + Number(order.total_zar ?? 0), 0) ?? 0,
    [data],
  );
  if (isLoading)
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-3">
      <Metric icon={Eye} label="Visitors (30 days)" value={(data?.views ?? 0).toLocaleString()} />
      <Metric
        icon={ShoppingBag}
        label="Orders (30 days)"
        value={(data?.orders.length ?? 0).toLocaleString()}
      />
      <Metric
        icon={BarChart3}
        label="Order value (30 days)"
        value={`R${sales.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`}
      />
    </section>
  );
}
function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </article>
  );
}

function CatalogueOperations() {
  const qc = useQueryClient();
  const getOperations = useServerFn(listCatalogueOperations);
  const getConnections = useServerFn(listSupplierConnections);
  const saveConnection = useServerFn(saveSupplierConnection);
  const stageImport = useServerFn(stageSupplierImport);
  const review = useServerFn(reviewImportedProduct);
  const [supplierName, setSupplierName] = useState("");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [sourceType, setSourceType] = useState<"website" | "api_feed">("website");
  const [importSupplierId, setImportSupplierId] = useState("");
  const [rowsText, setRowsText] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: operations, isLoading } = useQuery({
    queryKey: ["catalogue-operations"],
    queryFn: () => getOperations({ data: undefined as any }),
  });
  const { data: connections = [] } = useQuery({
    queryKey: ["supplier-connections"],
    queryFn: () => getConnections({ data: undefined as any }),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["catalogue-operations"] });
    qc.invalidateQueries({ queryKey: ["supplier-connections"] });
    qc.invalidateQueries({ queryKey: ["ceo-analytics"] });
    qc.invalidateQueries({ queryKey: ["ceo-products"] });
  };
  const addSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveConnection({
        data: {
          supplier_name: supplierName,
          base_url: supplierUrl,
          source_type: sourceType,
          is_enabled: true,
        },
      });
      setSupplierName("");
      setSupplierUrl("");
      toast.success("Supplier connection recorded");
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const importRows = async (event: React.FormEvent) => {
    event.preventDefault();
    let rows: unknown;
    try {
      rows = JSON.parse(rowsText);
    } catch {
      toast.error("Use a JSON list of product records.");
      return;
    }
    if (!Array.isArray(rows)) {
      toast.error("The import must be a JSON list.");
      return;
    }
    setBusy(true);
    try {
      const result = await stageImport({
        data: { supplier_connection_id: importSupplierId, rows, confirmed_by_owner: true },
      });
      setRowsText("");
      toast.success(
        `${result.staged_count} item(s) staged${result.rejected_count ? `; ${result.rejected_count} need attention` : ""}`,
      );
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const decide = async (id: string, action: "approve" | "reject") => {
    if (!confirm(`${action === "approve" ? "Publish" : "Reject"} this imported product?`)) return;
    try {
      await review({ data: { id, action } });
      toast.success(
        action === "approve" ? "Product approved and published" : "Import item rejected",
      );
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  if (isLoading)
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  return (
    <section className="mt-8 space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Supplier imports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual, supplier-agnostic intake. Connections hold no credentials here; every item stays
          private until you approve it.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addSupplier} className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Record a supplier connection</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Record a supplier you have manually authorised. This does not contact their site or save
            credentials.
          </p>
          <div className="mt-4 grid gap-3">
            <Input
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Supplier name"
            />
            <Input
              required
              type="url"
              value={supplierUrl}
              onChange={(e) => setSupplierUrl(e.target.value)}
              placeholder="https://supplier.example"
            />
            <label className="text-sm">
              Source type{" "}
              <select
                className="ml-2 rounded border bg-background px-2 py-1"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "website" | "api_feed")}
              >
                <option value="website">Website / manual source</option>
                <option value="api_feed">Authorised API feed</option>
              </select>
            </label>
            <Button disabled={busy}>
              <Plus className="mr-2 h-4 w-4" />
              Record supplier
            </Button>
          </div>
        </form>
        <form onSubmit={importRows} className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Stage a catalogue import</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste a normalised JSON list. Valid rows are priced at cost × 1.40 and sent to
            review—not the storefront.
          </p>
          <select
            required
            className="mt-4 w-full rounded border bg-background px-3 py-2 text-sm"
            value={importSupplierId}
            onChange={(e) => setImportSupplierId(e.target.value)}
          >
            <option value="">Choose a recorded supplier</option>
            {connections
              .filter((connection: any) => connection.is_enabled)
              .map((connection: any) => (
                <option key={connection.id} value={connection.id}>
                  {connection.supplier_name}
                </option>
              ))}
          </select>
          <Textarea
            required
            className="mt-3 min-h-32 font-mono text-xs"
            value={rowsText}
            onChange={(e) => setRowsText(e.target.value)}
            placeholder={
              '[{"title":"...","description":"...","category":"...","source_url":"https://...","supplier_cost_zar":100,"images":["https://...","https://...","https://...","https://...","https://..."]}]'
            }
          />
          <Button className="mt-3" disabled={busy}>
            <Upload className="mr-2 h-4 w-4" />
            Validate and stage
          </Button>
        </form>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Recorded supplier connections</h3>
        <div className="mt-4 space-y-2">
          {connections.length ? (
            connections.map((connection: any) => (
              <div
                key={connection.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{connection.supplier_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {connection.source_type === "api_feed"
                      ? "Authorised feed record"
                      : "Manual source record"}{" "}
                    · {connection.connection_status}
                  </p>
                </div>
                <a
                  className="text-xs underline"
                  href={connection.base_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source
                </a>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No supplier connections recorded.</p>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-display text-xl font-bold">Approval queue</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Approval publishes the product with the server-authoritative 40% markup. Check sources,
          stock, image rights and product facts first.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {operations?.reviews.length ? (
            operations.reviews.map((item: any) => (
              <article key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} · {item.supplier_name || "Supplier not set"}
                    </p>
                    <p className="mt-1 text-sm">
                      Cost R{Number(item.original_price_zar).toFixed(2)} → R
                      {Number(item.proposed_price_zar).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => decide(item.id, "approve")}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve & publish
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(item.id, "reject")}>
                    Reject
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              No imports await your review.
            </p>
          )}
        </div>
      </div>
      {operations?.errors.length ? (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-5 text-sm dark:bg-amber-950/20">
          <h3 className="font-semibold">Rows needing attention</h3>
          <ul className="mt-3 space-y-2">
            {operations.errors.map((error: any) => (
              <li key={error.id}>
                Import {error.catalogue_import_id.slice(0, 8)} · row {error.row_number}:{" "}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Recent operational activity</h3>
        <div className="mt-3 space-y-2 text-sm">
          {operations?.activity.length ? (
            operations.activity.map((event: any) => (
              <p key={event.id} className="rounded-lg bg-secondary/60 p-3">
                <span className="font-medium">{event.action.replaceAll("_", " ")}</span>{" "}
                <span className="text-muted-foreground">
                  · {new Date(event.created_at).toLocaleString("en-ZA")}
                </span>
              </p>
            ))
          ) : (
            <p className="text-muted-foreground">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Products() {
  const qc = useQueryClient();
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const [editing, setEditing] = useState<any | null>(null);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["ceo-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,title,description,price_zar,sale_price_zar,category,brand,sku,stock,image_url,images,is_featured,is_new_arrival,is_best_seller,is_active,product_supplier_sources(source_url,original_price_zar,supplier_name,supplier_sku,supplier_sku)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const removeProduct = async (id: string) => {
    if (!confirm("Permanently remove this product?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Product removed");
      qc.invalidateQueries({ queryKey: ["ceo-products"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  return (
    <section className="mt-8">
      <div className="flex justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Create products only after supplier review. Source data stays private.
          </p>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus className="mr-2 h-4 w-4" />
          Add product
        </Button>
      </div>
      {editing && (
        <ProductForm
          product={editing}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["ceo-products"] });
          }}
          save={save}
        />
      )}
      {isLoading ? (
        <Loader2 className="mx-auto my-16 animate-spin" />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {products.map((product: any) => (
            <article key={product.id} className="flex gap-3 rounded-xl border bg-card p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.title}</p>
                <p className="text-xs text-muted-foreground">
                  {product.category} · R
                  {Number(product.sale_price_zar ?? product.price_zar).toLocaleString("en-ZA")}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(product)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeProduct(product.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function ProductForm({ product, onDone, save }: { product: any; onDone: () => void; save: any }) {
  const source = Array.isArray(product.product_supplier_sources)
    ? product.product_supplier_sources[0]
    : product.product_supplier_sources;
  const getProductCopy = useServerFn(suggestProductCopy);
  const [busy, setBusy] = useState(false);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [images, setImages] = useState<string[]>(
    Array.from(new Set([product.image_url, ...(product.images ?? [])].filter(Boolean))),
  );
  const [form, setForm] = useState({
    title: product.title ?? "",
    description: product.description ?? "",
    price_zar: String(product.price_zar ?? ""),
    sale_price_zar: String(product.sale_price_zar ?? ""),
    category: product.category ?? "",
    brand: product.brand ?? "",
    sku: product.sku ?? "",
    stock: String(product.stock ?? ""),
    tags: Array.isArray(product.tags) ? product.tags : [],
    supplier_name: source?.supplier_name ?? "",
    supplier_source_url: source?.source_url ?? "",
    supplier_original_price_zar: String(source?.original_price_zar ?? ""),
    supplier_sku: source?.supplier_sku ?? "",
  });
  const supplierCost = Number(form.supplier_original_price_zar);
  const calculatedPrice =
    Number.isFinite(supplierCost) && supplierCost > 0
      ? Math.round(supplierCost * 1.4 * 100) / 100
      : null;
  const field = (key: string, label: string, type = "text") => (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <Input
        type={type}
        value={(form as any)[key]}
        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
      />
    </label>
  );
  const generateCopy = async () => {
    setGeneratingCopy(true);
    try {
      const result = await getProductCopy({
        data: {
          title: form.title,
          category: form.category,
          brand: form.brand,
          description: form.description,
        },
      });
      setForm({ ...form, description: result.description, tags: result.tags });
      toast.success("AI product description is ready. Review it before saving.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGeneratingCopy(false);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (images.length < 5) {
      toast.error("Upload at least 5 product photos before saving.");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          id: product.id,
          title: form.title,
          description: form.description,
          price_zar: calculatedPrice ?? 0,
          sale_price_zar: form.sale_price_zar ? Number(form.sale_price_zar) : null,
          category: form.category,
          brand: form.brand,
          sku: form.sku,
          stock: form.stock ? Number(form.stock) : null,
          image_url: images[0] ?? null,
          images,
          variations: [],
          tags: form.tags,
          is_featured: Boolean(product.is_featured),
          is_new_arrival: Boolean(product.is_new_arrival),
          is_best_seller: Boolean(product.is_best_seller),
          is_active: product.is_active ?? true,
          supplier_name: form.supplier_name,
          supplier_source_url: form.supplier_source_url,
          supplier_original_price_zar: form.supplier_original_price_zar
            ? Number(form.supplier_original_price_zar)
            : null,
          supplier_sku: form.supplier_sku,
        },
      });
      toast.success(product.id ? "Product updated" : "Product added");
      onDone();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2"
    >
      {field("title", "Product name")}
      {field("category", "Category")}
      <label className="grid gap-1 text-sm">
        <span>Selling price (R)</span>
        <Input
          type="number"
          value={calculatedPrice ?? ""}
          readOnly
          placeholder="Enter supplier cost below"
          aria-describedby="selling-price-help"
        />
        <span id="selling-price-help" className="text-xs text-muted-foreground">
          Automatically set to supplier cost + 40%. Delivery is added separately at checkout.
        </span>
      </label>
      {field("sale_price_zar", "Sale price (optional)", "number")}
      {field("brand", "Brand")}
      {field("sku", "SKU")}
      {field("stock", "Stock (leave blank if unlimited)", "number")}
      <ProductImageUploader
        images={images}
        onChange={setImages}
        folder={product.id || "catalogue"}
      />
      <div className="border-t pt-4 md:col-span-2">
        <p className="font-medium">Private supplier review record</p>
        <p className="text-xs text-muted-foreground">Never shown to customers.</p>
      </div>
      {field("supplier_name", "Supplier name (private)")}
      {field("supplier_original_price_zar", "Supplier cost (R, private)", "number")}
      {field("supplier_sku", "Supplier SKU (private)")}
      <div className="md:col-span-2">
        {field("supplier_source_url", "Supplier product link (private)")}
      </div>
      <div className="md:col-span-2">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-sm">Description</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generatingCopy || !form.title || !form.category}
            onClick={generateCopy}
          >
            {generatingCopy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Create with AI
          </Button>
        </div>
        <Textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save product
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Fulfilment() {
  const qc = useQueryClient();
  const getQueue = useServerFn(listFulfilmentQueue);
  const setFulfilment = useServerFn(updateManualFulfilment);
  const setOrder = useServerFn(updateOrderFulfillment);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["ceo-fulfilment"],
    queryFn: () => getQueue({ data: undefined as any }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["ceo-fulfilment"] });
  const changeFulfilment = async (id: string, fulfilment_status: string) => {
    try {
      await setFulfilment({ data: { id, fulfilment_status } });
      toast.success("Fulfilment updated");
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const changeOrder = async (id: string, status: string) => {
    try {
      await setOrder({ data: { id, status } });
      toast.success("Order status updated");
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const copy = async (order: any) => {
    const items = (order.order_items ?? [])
      .map((item: any) => {
        const source = Array.isArray(item.order_item_supplier_sources)
          ? item.order_item_supplier_sources[0]
          : item.order_item_supplier_sources;
        return `• ${item.qty} × ${item.title}${item.size ? ` (${item.size})` : ""}${item.color ? `, ${item.color}` : ""}${source?.supplier_name ? `\n  Supplier: ${source.supplier_name}` : ""}${source?.source_url ? `\n  Link: ${source.source_url}` : ""}${source?.original_price_zar != null ? `\n  Source cost: R${source.original_price_zar}` : ""}`;
      })
      .join("\n");
    const text = `NiberDealz order ${order.reference}\nCustomer: ${order.buyer_name}\nPhone: ${order.buyer_phone}\nDelivery: ${order.delivery_method}${order.delivery_tier ? ` (${order.delivery_tier})` : ""}\nAddress / pickup: ${order.paxi_pickup_point || order.delivery_address}\nNote: ${order.note || "—"}\n\nItems:\n${items}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Private fulfilment summary copied");
    } catch {
      toast.error("Could not copy the summary.");
    }
  };
  if (isLoading)
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  return (
    <section className="mt-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Manual fulfilment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check each supplier manually, place the order through the authorised supplier route, then
          keep its audit trail current. Payments remain disabled.
        </p>
      </div>
      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No orders need fulfilment.
          </p>
        ) : (
          orders.map((order: any) => (
            <article key={order.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("en-ZA")} · R
                    {Number(order.total_zar).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(order)}>
                    <Clipboard className="mr-1.5 h-4 w-4" />
                    Copy summary
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 rounded-lg bg-secondary/60 p-3 text-sm md:grid-cols-2">
                <div>
                  <p className="font-medium">Customer</p>
                  <p>{order.buyer_name}</p>
                  <p>{order.buyer_phone}</p>
                </div>
                <div>
                  <p className="font-medium">Delivery</p>
                  <p className="break-words">
                    {order.delivery_method} {order.delivery_tier ? `· ${order.delivery_tier}` : ""}
                  </p>
                  <p className="break-words">{order.paxi_pickup_point || order.delivery_address}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Items & private supplier source
                </p>
                <ul className="mt-2 space-y-2">
                  {(order.order_items ?? []).map((item: any) => {
                    const source = Array.isArray(item.order_item_supplier_sources)
                      ? item.order_item_supplier_sources[0]
                      : item.order_item_supplier_sources;
                    return (
                      <li key={item.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">
                          {item.qty} × {item.title} {item.size ? `· ${item.size}` : ""}{" "}
                          {item.color ? `· ${item.color}` : ""}
                        </p>
                        {item.comment && (
                          <p className="mt-1 text-muted-foreground">Note: {item.comment}</p>
                        )}
                        {source && (
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {source.supplier_name || "Supplier"}
                            {source.original_price_zar != null
                              ? ` · R${source.original_price_zar}`
                              : ""}
                            {source.source_url ? (
                              <>
                                {" "}
                                ·{" "}
                                <a
                                  className="underline"
                                  href={source.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open source
                                </a>
                              </>
                            ) : null}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">
                  Order
                  <select
                    className="ml-2 rounded border bg-background px-2 py-1"
                    value={order.status}
                    onChange={(e) => changeOrder(order.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Fulfilment
                  <select
                    className="ml-2 rounded border bg-background px-2 py-1"
                    value={order.fulfilment_status}
                    onChange={(e) => changeFulfilment(order.id, e.target.value)}
                  >
                    <option>Pending Fulfilment</option>
                    <option>Placed with supplier</option>
                    <option>Fulfilled</option>
                  </select>
                </label>
                {order.fulfilment_status === "Fulfilled" && (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Check className="h-3.5 w-3.5" />
                    Fulfilled
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function Admins() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminDirectory);
  const manage = useServerFn(manageAdministrator);
  const grant = useServerFn(grantAdministratorByEmail);
  const [email, setEmail] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["ceo-admins"],
    queryFn: () => list({ data: undefined as any }),
  });
  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await grant({ data: { email } });
      setEmail("");
      toast.success("Administrator added");
      qc.invalidateQueries({ queryKey: ["ceo-admins"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const revoke = async (id: string) => {
    if (!confirm("Remove this administrator's access?")) return;
    try {
      await manage({ data: { user_id: id, action: "remove" } });
      toast.success("Access removed");
      qc.invalidateQueries({ queryKey: ["ceo-admins"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="font-display text-2xl font-bold">Administrators</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Admins have no access to money, payment records, customer details, private supplier data,
        your personal details or staff management.
      </p>
      <form onSubmit={add} className="mt-5 flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Existing account email"
        />
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Add admin
        </Button>
      </form>
      <div className="mt-5 space-y-2">
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          data
            .filter((item: any) => item.role === "admin")
            .map((admin: any) => (
              <div
                key={admin.user_id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{admin.name || "Administrator"}</p>
                  <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => revoke(admin.user_id)}>
                  Remove
                </Button>
              </div>
            ))
        )}
      </div>
    </section>
  );
}
