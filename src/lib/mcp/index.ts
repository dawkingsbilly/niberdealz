import { defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import listStores from "./tools/list-stores";
import getProduct from "./tools/get-product";

export default defineMcp({
  name: "niberdealz-mcp",
  title: "Niberdealz Marketplace",
  version: "0.1.0",
  instructions:
    "Read-only tools for browsing the Niberdealz student-friendly marketplace. Use `search_products` to find listings by keyword/category/city, `list_stores` to discover approved vendors, and `get_product` to fetch full details for a single listing.",
  tools: [searchProducts, listStores, getProduct],
});
