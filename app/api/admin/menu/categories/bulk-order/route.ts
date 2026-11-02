
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    const email = session?.user?.email;
    const tenantSlug = session?.user?.tenantSlug;

    if (!email || !tenantSlug) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = await prisma.adminUser.findFirst({
      where: {
        email,
        isActive: true,
        tenant: {
          slug: tenantSlug,
          isActive: true,
        },
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
    const orders = body?.orders;

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { message: "Provide a non-empty list of category orders" },
        { status: 400 }
      );
    }

    if (
      orders.some(
        (entry) =>
          !entry ||
          typeof entry.id !== "string" ||
          !entry.id.trim() ||
          !Number.isSafeInteger(entry.sortOrder) ||
          entry.sortOrder < 1
      )
    ) {
      return NextResponse.json(
        { message: "Invalid category ID or display order" },
        { status: 400 }
      );
    }

    const categoryIds = orders.map(
      (entry: { id: string }) => entry.id
    );

    const sortOrders = orders.map(
      (entry: { sortOrder: number }) => entry.sortOrder
    );

    if (
      new Set(categoryIds).size !== categoryIds.length ||
      new Set(sortOrders).size !== sortOrders.length
    ) {
      return NextResponse.json(
        { message: "Duplicate category IDs or display orders" },
        { status: 400 }
      );
    }

    // Verify that every submitted category belongs to this tenant.
    const tenantCategories = await prisma.menuCategory.findMany({
      where: { tenantId: admin.tenantId },
      select: { id: true },
    });

    const validIds = new Set(
      tenantCategories.map((category) => category.id)
    );

    if (
      orders.length !== tenantCategories.length ||
      categoryIds.some((id: string) => !validIds.has(id))
    ) {
      return NextResponse.json(
        {
          message:
            "Category list is incomplete or contains categories outside your tenant. Refresh and try again.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Recheck tenant category membership inside the transaction.
      const current = await tx.menuCategory.findMany({
        where: { tenantId: admin.tenantId },
        select: { id: true },
      });

      const currentIds = new Set(current.map((c) => c.id));

      if (
        current.length !== orders.length ||
        categoryIds.some((id: string) => !currentIds.has(id))
      ) {
        throw new Error("Category list changed. Refresh and try again.");
      }

      for (const entry of orders as Array<{
        id: string;
        sortOrder: number;
      }>) {
        const result = await tx.menuCategory.updateMany({
          where: {
            id: entry.id,
            tenantId: admin.tenantId,
          },
          data: {
            sortOrder: entry.sortOrder,
          },
        });

        if (result.count !== 1) {
          throw new Error("Category update failed.");
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Category orders saved successfully",
      updated: orders.length,
    });
  } catch (error) {
    console.error("Bulk category order update failed:", error);

    return NextResponse.json(
      { message: "Unable to save category orders. Refresh and try again." },
      { status: 500 }
    );
  }
}
