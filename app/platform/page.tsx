
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import StripeActions from "./StripeActions";

export default async function PlatformPage() {
  const session = await getServerSession(authOptions);

  if (
    session?.user?.accountType !== "platform" ||
    session.user.role !== "platform-admin" ||
    !session.user.id
  ) {
    redirect("/platform/login");
  }

  const admin = await prisma.platformAdmin.findFirst({
    where: {
      id: session.user.id,
      role: "platform-admin",
      isActive: true,
    },
    select: {
      name: true,
    },
  });

  if (!admin) {
    redirect("/platform/login");
  }

  const tenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      brandName: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      platformFeeBps: true,
      stripeOnboardingOperation: {
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">
            Cohesion Consulting
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Resto Platform Administration
          </h1>

          <p className="mt-2 text-slate-600">
            Welcome, {admin.name}. Manage restaurant Stripe connections.
          </p>
        </div>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-semibold">
              Stripe Connect Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Restaurant payment account configuration
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-4">Restaurant</th>
                  <th className="px-5 py-4">Stripe Account</th>
                  <th className="px-5 py-4">Connection Status</th>
                  <th className="px-5 py-4">Charges</th>
                  <th className="px-5 py-4">Payouts</th>
                  <th className="px-5 py-4">Details</th>
                  <th className="px-5 py-4">Platform Fee</th>
                  <th className="px-5 py-4">Onboarding</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {tenant.brandName || tenant.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tenant.slug}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {tenant.stripeAccountId ? (
                        <span className="font-mono text-xs">
                          {tenant.stripeAccountId}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Not connected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {!tenant.stripeAccountId ? (
                        <span className="text-slate-500">
                          Not Connected
                        </span>
                      ) : tenant.stripeOnboardingOperation?.status === "REVIEW_REQUIRED" ? (
                        <span className="font-medium text-amber-700">
                          Manual Review
                        </span>
                      ) : tenant.stripeChargesEnabled && tenant.stripePayoutsEnabled ? (
                        <span className="font-medium text-green-700">
                          Ready
                        </span>
                      ) : (
                        <span className="font-medium text-amber-700">
                          Connected — Action Needed
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {tenant.stripeChargesEnabled ? "Enabled" : "Disabled"}
                    </td>

                    <td className="px-5 py-4">
                      {tenant.stripePayoutsEnabled ? "Enabled" : "Disabled"}
                    </td>

                    <td className="px-5 py-4">
                      {tenant.stripeDetailsSubmitted ? "Submitted" : "Pending"}
                    </td>

                    <td className="px-5 py-4">
                      {(tenant.platformFeeBps / 100).toFixed(2)}%
                    </td>

                    <td className="px-5 py-4">
                      {tenant.stripeOnboardingOperation?.status || "Not started"}
                    </td>

                    <td className="px-5 py-4">
                      <StripeActions
                        tenantSlug={tenant.slug}
                        stripeAccountId={tenant.stripeAccountId}
                        onboardingStatus={
                          tenant.stripeOnboardingOperation?.status ?? null
                        }
                        stripeChargesEnabled={tenant.stripeChargesEnabled}
                        stripePayoutsEnabled={tenant.stripePayoutsEnabled}
                      />
                    </td>


                  </tr>
                ))}

                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                      No active restaurant tenants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-5 text-sm text-slate-500">
          Stripe account status reflects the latest values stored in Resto.
          Use Stripe status synchronization to retrieve current values
          from Stripe once management controls are enabled.
        </p>
      </div>
    </main>
  );
}
