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

  const isSindhu =
    /sindhu/i.test(tenant.name) ||
    /sindhu/i.test(tenant.branding.logoText);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative flex min-h-[80vh] items-center justify-center px-6 py-16 text-center text-white">
        <div className="absolute inset-0 bg-[url('/images/hero.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 w-full max-w-3xl">
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

          {isSindhu ? (
            <div className="mt-8 rounded-2xl border border-white/20 bg-black/40 p-6 md:p-8">
              <h2 className="text-2xl font-semibold md:text-3xl">
                Sindhu Indian Cuisine has two locations now
              </h2>

              <p className="mt-3 text-lg text-gray-200">
                Please order from East or West.
              </p>

              <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">
                <details>
                  <summary className="cursor-pointer list-none rounded-full bg-orange-600 px-8 py-3 text-lg font-semibold transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
                    East
                  </summary>

                  <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-5">
                    <p className="font-semibold text-slate-900">
                      We are moving from Hannah Plaza to Hannah Lofts,
                      just a couple of blocks from Hannah Plaza!
                    </p>

                    <address className="mt-3 not-italic leading-7 text-slate-700">
                      2929 Hannah Blvd.<br />
                      East Lansing, MI 48823
                    </address>

                    <a
                      href="https://sindhu-indian-west.cloveronline.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block font-semibold text-orange-700 hover:underline"
                    >
                      Until we open, please visit our West Side location →
                    </a>

                    <p className="mt-4 font-bold text-orange-700">
                      East or West — Sindhu is the Best!
                    </p>
                  </div>
                </details>

                <div>
                  <a
                    href="https://sindhu-indian-west.cloveronline.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-full bg-orange-600 px-8 py-3 text-lg font-semibold transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    West
                  </a>

                  <address className="mt-4 not-italic leading-7 text-gray-200">
                    2010 W Saginaw Street
                    <br />
                    Lansing, MI 48915
                  </address>

                  <a
                    href="tel:+15179008469"
                    className="mt-2 inline-block text-orange-300 hover:underline"
                  >
                    (517) 900-8469
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
              {tenant.branding.heroSubtitle}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${tenant.slug}/menu`}
              className="rounded-full bg-orange-600 px-6 py-3 font-semibold transition hover:bg-orange-700"
            >
              Explore Menu
            </Link>

            {!isSindhu && (
              <Link
                href={`/${tenant.slug}/contact`}
                className="rounded-full border border-white px-6 py-3 hover:bg-white hover:text-black"
              >
                Contact Us
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}