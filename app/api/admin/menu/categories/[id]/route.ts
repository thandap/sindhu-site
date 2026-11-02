
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

        // Allow updating activation, display order, or both.
        const hasIsActive = Object.prototype.hasOwnProperty.call(
            body,
            "isActive"
        );
        const hasSortOrder = Object.prototype.hasOwnProperty.call(
            body,
            "sortOrder"
        );

        if (!hasIsActive && !hasSortOrder) {
            return NextResponse.json(
                { message: "Provide isActive or sortOrder" },
                { status: 400 }
            );
        }

        if (hasIsActive && typeof body.isActive !== "boolean") {
            return NextResponse.json(
                { message: "isActive must be true or false" },
                { status: 400 }
            );
        }

        if (
            hasSortOrder &&
            (!Number.isInteger(body.sortOrder) || body.sortOrder < 1)
        ) {
            return NextResponse.json(
                { message: "sortOrder must be a positive integer" },
                { status: 400 }
            );
        }

        const data: {
            isActive?: boolean;
            sortOrder?: number;
        } = {};

        if (hasIsActive) {
            data.isActive = body.isActive;
        }

        if (hasSortOrder) {
            data.sortOrder = body.sortOrder;
        }

        const result = await prisma.menuCategory.updateMany({
            where: {
                id,
                tenantId: admin.tenantId,
            },
            data,
        });

        if (result.count !== 1) {
            return NextResponse.json(
                { message: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: hasSortOrder
                ? "Category display order updated successfully"
                : body.isActive
                    ? "Category activated successfully"
                    : "Category deactivated successfully",
        });
    } catch (error) {
        console.error("PATCH menu category failed:", error);

        return NextResponse.json(
            { message: "Failed to update category" },
            { status: 500 }
        );
    }
}
