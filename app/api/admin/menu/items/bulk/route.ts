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

        const itemIds: unknown = body.itemIds;
        const action: unknown = body.action;


        if (
            !Array.isArray(itemIds) ||
            itemIds.length === 0 ||
            itemIds.length > 200 ||
            !itemIds.every(
                (id: unknown) =>
                    typeof id === "string" &&
                    id.length > 0 &&
                    id.length <= 100
            )
        ) {
            return NextResponse.json(
                { message: "Invalid menu item selection" },
                { status: 400 }
            );
        }

        const uniqueIds: string[] = [...new Set<string>(itemIds)];

        // Move selected dishes to another category.
        if (action === "move") {
            const categoryId: unknown = body.categoryId;

            if (
                typeof categoryId !== "string" ||
                !categoryId.trim()
            ) {
                return NextResponse.json(
                    { message: "Select a destination category" },
                    { status: 400 }
                );
            }

            const category = await prisma.menuCategory.findFirst({
                where: {
                    id: categoryId,
                    tenantId: admin.tenantId,
                },
                select: { id: true },
            });

            if (!category) {
                return NextResponse.json(
                    { message: "Destination category not found" },
                    { status: 404 }
                );
            }

            const result = await prisma.menuItem.updateMany({
                where: {
                    tenantId: admin.tenantId,
                    id: { in: uniqueIds },
                },
                data: {
                    categoryId: category.id,
                },
            });

            if (result.count !== uniqueIds.length) {
                return NextResponse.json(
                    {
                        message: "Some selected items were not found. Refresh and review.",
                        updatedCount: result.count,
                    },
                    { status: 409 }
                );
            }

            return NextResponse.json({
                success: true,
                updatedCount: result.count,
                message: "Items moved successfully",
            });
        }

        // Existing Publish / Hide functionality.
        if (action === undefined || action === "visibility") {
            if (typeof body.isActive !== "boolean") {
                return NextResponse.json(
                    { message: "Invalid publishing status" },
                    { status: 400 }
                );
            }

            const result = await prisma.menuItem.updateMany({
                where: {
                    tenantId: admin.tenantId,
                    id: { in: uniqueIds },
                },
                data: {
                    isActive: body.isActive,
                },
            });

            return NextResponse.json({
                success: true,
                updatedCount: result.count,
            });
        }

        return NextResponse.json(
            { message: "Unsupported bulk action" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Bulk menu update failed:", error);

        return NextResponse.json(
            { message: "Failed to update menu items" },
            { status: 500 }
        );
    }
}