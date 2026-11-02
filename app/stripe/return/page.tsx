import Link from "next/link";

export default function StripeReturnPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl bg-white p-8 shadow-sm border text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Stripe Onboarding Submitted
        </h1>

        <p className="mt-4 text-slate-600">
          Thank you for completing the Stripe onboarding process.
          Your restaurant payment account may still require
          verification before payments can be accepted.
        </p>

        <p className="mt-4 text-sm text-slate-500">
          Please contact your Resto platform administrator if
          additional information or assistance is needed.
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