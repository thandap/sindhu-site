import { getTenantBySlug } from "@/lib/tenant/getTenantConfig";
import { getMenuByTenant } from "@/lib/menu/getMenuByTenant";
import TenantMenuClient from "@/components/menu/TenantMenuClient";

type Props = {
  params: Promise<{
    tenant: string;
  }>;
};

export default async function MenuPage({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  const tenant = getTenantBySlug(tenantSlug);

  if (!tenant) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold">Tenant not found</h1>
      </main>
    );
  }

  const menuData = getMenuByTenant(tenant.slug);

  return (
    <TenantMenuClient
      tenantSlug={tenant.slug}
      tenantBrandName={tenant.brandName}
      tenantSubtitle={tenant.branding.heroSubtitle}
      menuData={menuData}
    />
  );
}