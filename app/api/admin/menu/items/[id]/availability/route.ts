
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
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
        tenant: { slug: tenantSlug },
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

    if (typeof body.isAvailable !== "boolean") {
      return NextResponse.json(
        { message: "isAvailable must be true or false" },
        { status: 400 }
      );
    }

    const result = await prisma.menuItem.updateMany({
      where: {
        id,
        tenantId: admin.tenantId,
      },
      data: {
        isAvailable: body.isAvailable,
      },
    });

    if (result.count !== 1) {
      return NextResponse.json(
        { message: "Menu item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      isAvailable: body.isAvailable,
    });
  } catch (error) {
    console.error("Update item availability failed:", error);

    return NextResponse.json(
      { message: "Unable to update availability" },
      { status: 500 }
    );
  }
}
