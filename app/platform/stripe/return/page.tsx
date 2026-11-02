
import Link from "next/link";

export default function StripeReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold">
          Stripe Setup Submitted
        </h1>

        <p className="mt-4 text-slate-600">
          Thank you for completing the Stripe onboarding
          steps for your restaurant.
        </p>

        <p className="mt-3 text-slate-600">
          Your information has been returned to the Resto
          platform. Stripe may require additional information
          or verification before payments and payouts can
          be enabled.
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Returning to this page does not confirm that
            your Stripe account is fully activated.
            Cohesion will verify the account status.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-orange-700 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800"
          >
            Return to Resto
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Powered by Resto | Cohesion Consulting
        </p>
      </div>
    </main>
  );
}
