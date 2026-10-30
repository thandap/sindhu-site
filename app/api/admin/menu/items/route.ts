
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const tenantSlug = session?.user?.tenantSlug;
    const email = session?.user?.email;

    if (!tenantSlug || !email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = await prisma.adminUser.findFirst({
      where: {
        email,
        isActive: true,
        tenant: { slug: tenantSlug, isActive: true },
      },
      select: { tenantId: true },
    });

    if (!admin) {
      return NextResponse.json(
        { message: "Administrator not authorized" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const categoryId =
      typeof body.categoryId === "string"
        ? body.categoryId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const price = body.price;

    if (!categoryId || !name || name.length > 150) {
      return NextResponse.json(
        { message: "Valid category and item name are required" },
        { status: 400 }
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { message: "Description is too long" },
        { status: 400 }
      );
    }

    // Accept a price in dollars with at most two decimal places.
    const priceText = String(price ?? "").trim();

    if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {
      return NextResponse.json(
        { message: "Enter a valid price, such as 9.99" },
        { status: 400 }
      );
    }

    const [dollars, cents = ""] = priceText.split(".");
    const priceCents =
      Number(dollars) * 100 + Number(cents.padEnd(2, "0"));

    if (
      !Number.isSafeInteger(priceCents) ||
      priceCents <= 0 ||
      priceCents > 10000000
    ) {
      return NextResponse.json(
        { message: "Price must be between $0.01 and $100,000" },
        { status: 400 }
      );
    }

    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        tenantId: admin.tenantId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Category not found for this restaurant" },
        { status: 404 }
      );
    }

    const slug = name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { message: "Item name must contain letters or numbers" },
        { status: 400 }
      );
    }

    // Avoid duplicate slugs within the same restaurant.
    const existing = await prisma.menuItem.findFirst({
      where: {
        tenantId: admin.tenantId,
        slug,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "An item with this name already exists" },
        { status: 409 }
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        tenantId: admin.tenantId,
        categoryId: category.id,
        name,
        slug,
        description: description || null,
        priceCents,
        isVegetarian: body.isVegetarian === true,
        isVegan: body.isVegan === true,
        isActive: true,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        priceCents: true,
        categoryId: true,
      },
    });

    return NextResponse.json(
      { success: true, item },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "A menu item with this name already exists" },
        { status: 409 }
      );
    }

    console.error("POST /api/admin/menu/items failed:", error);

    return NextResponse.json(
      { message: "Failed to create menu item" },
      { status: 500 }
    );
  }
}
