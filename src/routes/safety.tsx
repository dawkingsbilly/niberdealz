import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Shopping safety | NiberDealz" },
      {
        name: "description",
        content: "How NiberDealz keeps direct ordering clear and safe.",
      },
    ],
  }),
  component: Safety,
});

function Safety() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl flex-1 px-4 py-12 text-sm leading-relaxed">
        <h1 className="font-display text-3xl font-bold">Shopping safety</h1>
        <p className="mt-5">
          NiberDealz is the direct seller for the products on this website. Order communication
          should come only from official NiberDealz channels.
        </p>
        <h2 className="font-display mt-8 text-xl font-bold">Shop safely</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Use this website to submit an order request and keep your confirmation reference.</li>
          <li>
            Do not share passwords, card details or one-time codes by email, SMS, social media or
            chat.
          </li>
          <li>
            Check that you are on <strong>www.niberdealz.co.za</strong> before entering information.
          </li>
          <li>Contact NiberDealz if a message looks unexpected or you need help with an order.</li>
        </ul>
        <h2 className="font-display mt-8 text-xl font-bold">Orders and delivery</h2>
        <p className="mt-3">
          Card payments are not available through this site. NiberDealz will review availability and
          contact you about next steps using your order reference. Delivery, PAXI or collection
          arrangements are confirmed after that review.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
