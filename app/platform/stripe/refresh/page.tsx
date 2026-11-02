
import Link from "next/link";

export default function StripeRefreshPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
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
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold">
          Stripe Setup Link Expired
        </h1>

        <p className="mt-4 text-slate-600">
          Your Stripe onboarding link may have expired,
          already been used, or become invalid.
        </p>

        <p className="mt-3 text-slate-600">
          For your security, Stripe onboarding links
          are temporary and cannot be reused.
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Please contact Cohesion Consulting to request
            a new secure Stripe onboarding link.
            You do not need to create another Stripe account.
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-orange-700 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-800"
        >
          Return to Resto
        </Link>

        <p className="mt-6 text-xs text-slate-500">
          Powered by Resto | Cohesion Consulting
        </p>
      </div>
    </main>
  );
}
