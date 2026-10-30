
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import MenuAdminClient from "./MenuAdminClient";

type Props = {
  params: Promise<{
    tenant: string;
  }>;
};

export default async function MenuAdminPage({ params }: Props) {
  const { tenant } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.tenantSlug !== tenant) {
    redirect(`/${tenant}/admin/login`);
  }

  const restaurant = await prisma.tenant.findUnique({
    where: { slug: tenant },
    select: {
      id: true,
      name: true,
    },
  });

  if (!restaurant) {
    redirect(`/${tenant}/admin/login`);
  }

  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: restaurant.id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
  <MenuAdminClient
    restaurantName={restaurant.name}
    categories={categories}
  />
);
}
