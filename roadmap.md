# Roadmap

## In progress (current turn)
- [x] Forgot password + reset password pages (done, verify end to end)
- [x] Seller delivery options: seller sets own fee and days per method; no free default for courier/paxi
- [x] Affiliate dashboard wired (/affiliate, header + footer links)
- [x] On site checkout (cart -> placeOrder -> /orders)
- [ ] Verify checkout + reset password end to end in the browser

## Next: single owner store rebuild (new request)
- [ ] Remove public vendor marketplace: vendor registration, stores, vendor dashboards, vendor storefronts, vendor WhatsApp checkout, "open a free store" links
- [ ] All products belong to NiberDealz (single seller); no seller selection at checkout
- [ ] Keep and upgrade CEO Control Room: Overview, Products, Categories, Inventory, Orders, Customers, Analytics, Discounts, Reviews, Admin management, Store settings, Payment settings, Security, Activity logs
- [ ] Roles: CEO/owner (full, only role for payment config) and ADMIN (products, inventory, orders, customers, basic analytics, reviews); enforce server side
- [ ] Admin management: invite/create/disable/remove admins, last login, status
- [ ] Activity log table + recording of product, stock, price, order, admin, settings changes; no admin deletes
- [ ] Product model: name, description, images, price, sale price, category, brand, SKU, stock, size, colour, variations, featured/new/best seller, tags, active
- [ ] Inventory: stock decrement on paid order, never negative, low stock view
- [ ] Categories: Fashion, Shoes, Beauty, Phone Accessories, Home Essentials, Health & Fitness, CEO manageable
- [ ] Public store: Home, Shop, Categories, Search with filters and sorting, Cart, Checkout, Payment, Order confirmation, Account
- [ ] Homepage sections in black/white/blue, no fake stats or reviews
- [ ] WhatsApp as support only, with order number
- [ ] Analytics: sales, orders, customers, revenue, products sold, top products, low stock, views, add to cart, checkout starts
- [ ] Test customer, admin and CEO journeys including denied payment access for admins

## Blocked / user side
- [ ] Payment provider not connected yet (Stripe or Paddle) so orders sit as Awaiting payment
- [ ] Google Business Profile owner verification
