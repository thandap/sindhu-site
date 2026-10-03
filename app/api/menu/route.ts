import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function formatPrice(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = request.nextUrl.searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing tenant" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true, brandName: true, config: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    const categories = await prisma.menuCategory.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        items: {
          where: {
            isActive: true,
            isAvailable: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    const menu = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      sortOrder: category.sortOrder,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        image: item.image,
        priceCents: item.priceCents,
        price: formatPrice(item.priceCents),
        isFeatured: item.isFeatured,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        spiceLevel: item.spiceLevel,
        sortOrder: item.sortOrder,
      })),
    }));

    return NextResponse.json({
      success: true,
      tenant: {
        slug: tenant.slug,
        name: tenant.name,
        brandName: tenant.brandName,
      },
      menu,
    });
  } catch (error) {
    console.error("GET /api/menu failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load menu" },
      { status: 500 }
    );
  }
}