
import Link from "next/link";

export default function StripeRefreshPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Stripe Onboarding Link Expired
        </h1>

        <p className="mt-4 text-slate-600">
          Your Stripe onboarding link has expired or is no longer
          available.
        </p>

        <p className="mt-4 text-slate-600">
          Please contact your Resto platform administrator to
          request a new secure onboarding invitation.
        </p>

        <p className="mt-4 text-sm text-slate-500">
          Your restaurant payment account may already exist.
          You do not need to create another Stripe account.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-orange-700 px-6 py-3 font-medium text-white hover:bg-orange-800"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}
