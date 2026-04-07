import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import TenantAdminOrdersClient from "./OrdersClient";

type Props = {
  params: Promise<{
    tenant: string;
  }>;
};

export default async function Page({ params }: Props) {
 
  const { tenant } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.tenantSlug !== tenant) {
    console.log("REDIRECTING TO LOGIN WITH tenant =", tenant);
    redirect(`/${tenant}/admin/login`);
  }

  return <TenantAdminOrdersClient tenant={tenant} />;
}