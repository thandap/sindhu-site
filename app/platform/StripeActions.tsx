
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StripeActionsProps = {
    tenantSlug: string;
    stripeAccountId: string | null;
    onboardingStatus: string | null;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
};

type OnboardingMethod = "SELF_SERVICE" | "ASSISTED";

export default function StripeActions({
    tenantSlug,
    stripeAccountId,
    onboardingStatus,
    stripeChargesEnabled,
    stripePayoutsEnabled,
}: StripeActionsProps) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [onboardingMethod, setOnboardingMethod] =
        useState<OnboardingMethod>("SELF_SERVICE");

    const [invitationUrl, setInvitationUrl] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Initial rollout: Sindhu restaurants only.
    const onboardingAllowed =
        tenantSlug === "sindhu-east" ||
        tenantSlug === "sindhu-west";

    const requiresReview =
        onboardingStatus === "REVIEW_REQUIRED" ||
        onboardingStatus === "CREATING" ||
        (onboardingStatus === "CREATED" && !stripeAccountId);

    const stripeReady =
        Boolean(stripeAccountId) &&
        stripeChargesEnabled &&
        stripePayoutsEnabled;

    async function generateInvitation() {
        if (
            loading ||
            !onboardingAllowed ||
            stripeAccountId ||
            requiresReview
        ) {
            return;
        }

        setLoading(true);
        setMessage("");
        setError("");
        setInvitationUrl("");

        try {
            const response = await fetch(
                "/api/platform/stripe/invitations",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tenantSlug,
                        onboardingMethod,
                    }),
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (
                !response.ok ||
                !data.success ||
                typeof data.invitationUrl !== "string"
            ) {
                throw new Error(
                    data.message || "Unable to generate invitation"
                );
            }

            const parsedUrl = new URL(data.invitationUrl);

            if (
                parsedUrl.origin !== window.location.origin ||
                parsedUrl.pathname !== "/stripe/invite" ||
                !/^[a-f0-9]{64}$/i.test(
                    parsedUrl.searchParams.get("token") || ""
                )
            ) {
                throw new Error(
                    "Invitation URL did not match the current application."
                );
            }

            setInvitationUrl(parsedUrl.toString());
            setMessage("Invitation generated successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to generate invitation"
            );
        } finally {
            setLoading(false);
        }
    }

    async function copyInvitation() {
        if (!invitationUrl) return;

        try {
            await navigator.clipboard.writeText(invitationUrl);
            setMessage("Invitation link copied.");
            setError("");
        } catch {
            setError(
                "Unable to copy automatically. Please copy the link manually."
            );
        }
    }

    async function continueOnboarding() {
        if (
            loading ||
            !onboardingAllowed ||
            !stripeAccountId ||
            stripeReady ||
            requiresReview
        ) {
            return;
        }

        setLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/connect/onboard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tenantSlug,
                    onboardingMethod: "SELF_SERVICE",
                }),
                cache: "no-store",
            });

            const data = await response.json();

            if (
                !response.ok ||
                !data.success ||
                typeof data.url !== "string"
            ) {
                throw new Error(
                    data.message || "Unable to continue Stripe onboarding"
                );
            }

            const onboardingUrl = new URL(data.url);

            if (
                onboardingUrl.protocol !== "https:" ||
                !(
                    onboardingUrl.hostname === "stripe.com" ||
                    onboardingUrl.hostname.endsWith(".stripe.com")
                )
            ) {
                throw new Error("Invalid Stripe onboarding URL");
            }

            window.location.assign(onboardingUrl.toString());
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to continue Stripe onboarding"
            );
            setLoading(false);
        }
    }

    async function refreshStatus() {
        if (!stripeAccountId || loading) return;

        setLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/connect/sync-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tenantSlug }),
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to refresh Stripe status"
                );
            }

            setMessage("Status updated.");
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to refresh Stripe status"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-w-44 space-y-2">
            {stripeAccountId ? (
                <div className="space-y-2">
                    {onboardingAllowed && !stripeReady && !requiresReview && (
                        <button
                            type="button"
                            onClick={continueOnboarding}
                            disabled={loading}
                            className="w-full rounded-lg bg-orange-700 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Connecting..." : "Continue Onboarding"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={refreshStatus}
                        disabled={loading}
                        className="w-full rounded-lg border border-orange-700 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                    >
                        {loading ? "Refreshing..." : "Refresh Status"}
                    </button>

                    {!stripeReady && (
                        <p className="text-xs text-amber-700">
                            Stripe account setup or verification is incomplete.
                        </p>
                    )}
                </div>
            ) : requiresReview ? (
                <span className="text-xs font-medium text-amber-700">
                    Manual review required
                </span>
            ) : (
                <div className="space-y-2">
                    <select
                        aria-label={`Onboarding method for ${tenantSlug}`}
                        value={onboardingMethod}
                        onChange={(e) => {
                            setOnboardingMethod(
                                e.target.value as OnboardingMethod
                            );
                            setInvitationUrl("");
                            setMessage("");
                            setError("");
                        }}
                        disabled={!onboardingAllowed || loading}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-800 disabled:bg-slate-100"
                    >
                        <option value="SELF_SERVICE">Self-Service</option>
                        <option value="ASSISTED">Assisted</option>
                    </select>

                    <button
                        type="button"
                        onClick={generateInvitation}
                        disabled={!onboardingAllowed || loading}
                        className="w-full rounded-lg bg-orange-700 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                        {loading
                            ? "Generating..."
                            : "Generate Invitation"}
                    </button>

                    {!onboardingAllowed && (
                        <p className="text-xs text-slate-500">
                            Migration pending.
                        </p>
                    )}

                    {invitationUrl && (
                        <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-2">
                            <p className="text-xs font-medium text-green-800">
                                Secure invitation ready
                            </p>

                            <input
                                type="text"
                                readOnly
                                aria-label={`Invitation link for ${tenantSlug}`}
                                value={invitationUrl}
                                onFocus={(e) => e.target.select()}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700"
                            />

                            <button
                                type="button"
                                onClick={copyInvitation}
                                className="w-full rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
                            >
                                Copy Invitation Link
                            </button>

                            <p className="text-xs text-slate-600">
                                Share this link privately with the restaurant owner.
                                It expires after 24 hours.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {message && (
                <p role="status" className="text-xs text-green-700">
                    {message}
                </p>
            )}

            {error && (
                <p role="alert" className="max-w-56 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
