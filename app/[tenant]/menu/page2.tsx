import MenuClient from "./MenuClient";

type Props = {
  params: Promise<{
    tenant: string;
  }>;
};

export default async function TenantMenuPage({ params }: Props) {
  const { tenant } = await params;

  return <MenuClient tenant={tenant} />;
}