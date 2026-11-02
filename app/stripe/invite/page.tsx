
"use client";

import { useEffect, useState } from "react";

type InvitationInfo = {
  success: true;
  valid: true;
  tenantSlug: string;
  onboardingMethod: string;
  expiresAt: string;
};

export default function StripeInvitePage() {
  const [invitation, setInvitation] =
    useState<InvitationInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [startingOnboarding, setStartingOnboarding] = useState(false);


  useEffect(() => {
    let cancelled = false;

    async function validateInvitation() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") || "";
      if (/^[a-f0-9]{64}$/i.test(token)) {
        setInvitationToken(token);
      }

      // Remove the secret from the browser address bar
      // after reading it.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname
      );

      if (!/^[a-f0-9]{64}$/i.test(token)) {
        if (!cancelled) {
          setError("This invitation link is invalid.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          "/api/stripe/invitations/redeem",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to validate invitation."
          );
        }

        if (!cancelled) {
          setInvitation(data as InvitationInfo);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to validate invitation."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void validateInvitation();

    return () => {
      cancelled = true;
    };
  }, []);


  async function handleContinueToStripe() {
    if (
      startingOnboarding ||
      !invitation ||
      !/^[a-f0-9]{64}$/i.test(invitationToken)
    ) {
      return;
    }

    setStartingOnboarding(true);
    setError("");

    try {
      const response = await fetch(
        "/api/stripe/invitations/redeem",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: invitationToken,
            action: "START_ONBOARDING",
          }),
          cache: "no-store",
          referrerPolicy: "no-referrer",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Unable to start Stripe onboarding."
        );
      }

      if (
        typeof data.url !== "string" ||
        !data.url.startsWith("https://connect.stripe.com/")
      ) {
        throw new Error(
          "Stripe returned an unexpected onboarding URL."
        );
      }

      // Leave Resto and open Stripe's secure onboarding flow.
      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start Stripe onboarding."
      );
      setStartingOnboarding(false);
    }
  }


  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">
            Resto by Cohesion
          </p>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Stripe Payment Setup
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Secure payment onboarding for your restaurant.
          </p>
        </div>

        {loading && (
          <p className="text-center text-slate-600">
            Validating your invitation...
          </p>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <p className="mt-2">
              Please contact Cohesion for a new invitation.
            </p>
          </div>
        )}

        {!loading && invitation && (
          <div className="space-y-5">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">
                Invitation verified
              </p>

              <p className="mt-2 text-sm text-slate-700">
                Restaurant:{" "}
                <span className="font-semibold">
                  {invitation.tenantSlug}
                </span>
              </p>

              <p className="mt-1 text-sm text-slate-700">
                Setup method:{" "}
                {invitation.onboardingMethod === "ASSISTED"
                  ? "Assisted"
                  : "Self-service"}
              </p>
            </div>

            <p className="text-sm text-slate-600">
              Your restaurant is ready for the next step
              of payment setup. You will complete business
              verification and banking details securely
              through Stripe.
            </p>


            <button
              type="button"
              onClick={handleContinueToStripe}
              disabled={startingOnboarding || !invitationToken}
              className="w-full rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {startingOnboarding
                ? "Connecting to Stripe..."
                : "Continue to Stripe"}
            </button>


            <p className="text-center text-xs text-slate-500">
              You will be redirected to Stripe to securely provide
              your business and banking information.
            </p>

            {error && (
              <p role="alert" className="text-center text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
