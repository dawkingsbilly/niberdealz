# NiberDealz

A direct-to-customer fashion storefront for discovering and ordering curated NiberDealz pieces.

> **Store model:** NiberDealz is the sole seller. This is not a multi-vendor marketplace: customers cannot register as sellers, create public shops, or select vendors at checkout.

## Features

- Editorial, mobile-first fashion storefront
- Product browsing, search, category filters, and product details
- Cart and secure server-side checkout
- Customer authentication and order history
- Admin Control Room for store operations
- Supabase-backed data and protected ecommerce actions

## Technology

React 19, TypeScript, TanStack Start, TanStack Router, Vite, Supabase, Tailwind CSS, and Radix UI.

## Run locally

### Prerequisites

- [Bun](https://bun.sh) (recommended) or a compatible Node.js environment
- A configured Supabase project

### Setup

```sh
git clone https://github.com/dawkingsbilly/niberdealz.git
cd niberdealz
bun install
cp .env.example .env
```

Add your own environment values to `.env`. Never commit credentials or production keys.

### Start development

```sh
bun run dev
```

### Build for production

```sh
bun run build
```

## Security

- Checkout and order creation run server-side.
- Admin tools require authenticated access.
- Payment secrets belong in the hosting environment, never in Git or the browser bundle.

## Deployment

Deploy to a host that supports the TanStack Start/Nitro server runtime and environment variables. GitHub Pages is static-only and cannot run secure checkout or authentication services.

## Repository

[github.com/dawkingsbilly/niberdealz](https://github.com/dawkingsbilly/niberdealz)
