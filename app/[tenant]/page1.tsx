import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant/getTenantConfig";

type Props = {
  params: Promise<{
    tenant: string;
  }>;
};

export default async function TenantHome({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  const tenant = getTenantBySlug(tenantSlug);

  if (!tenant) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">Tenant not found</h1>
          <p className="mt-4 text-slate-600">
            We could not find a restaurant for this route.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative flex h-[80vh] items-center justify-center text-center text-white">
        <div className="absolute inset-0 bg-[url('/images/hero.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 px-6">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
            {tenant.businessType === "catering"
              ? "Premium Catering Services"
              : "Authentic Indian Dining"}
          </p>

          <h1 className="text-5xl font-bold tracking-widest md:text-7xl">
            {tenant.branding.logoText}
          </h1>

          <p className="mt-3 text-2xl text-gray-200 md:text-3xl">
            {tenant.name}
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            {tenant.branding.heroSubtitle}
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={`/${tenant.slug}/menu`}
              className="rounded-full bg-orange-600 px-6 py-3 font-semibold transition hover:bg-orange-700"
            >
              Explore Menu
            </Link>

            <Link
              href={`/${tenant.slug}/contact`}
              className="rounded-full border border-white px-6 py-3 hover:bg-white hover:text-black"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}