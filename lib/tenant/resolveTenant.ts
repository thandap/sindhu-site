import type { TenantConfig } from "@/types/tenant";
import {
  getDefaultTenant,
  getTenantByDomain,
  getTenantBySlug,
} from "./getTenantConfig";

type ResolveTenantInput = {
  hostname?: string | null;
  pathname?: string | null;
};

function normalizeHostname(hostname?: string | null) {
  if (!hostname) return "";
  return hostname.toLowerCase().replace(/^www\./, "").split(":")[0];
}

export function resolveTenant({
  hostname,
  pathname,
}: ResolveTenantInput): TenantConfig | null {
  const cleanHost = normalizeHostname(hostname);
  const cleanPath = pathname || "/";

  if (
    !cleanHost ||
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1"
  ) {
    const parts = cleanPath.split("/").filter(Boolean);
    const slug = parts[0];
    if (!slug) return getDefaultTenant();
    return getTenantBySlug(slug) || null;
  }

  if (cleanHost.endsWith(".resto.com")) {
    const subdomain = cleanHost.replace(".resto.com", "");
    return getTenantBySlug(subdomain) || null;
  }

  return getTenantByDomain(cleanHost) || null;
}