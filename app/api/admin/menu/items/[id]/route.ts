
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
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

        const categoryId =
            typeof body.categoryId === "string"
                ? body.categoryId.trim()
                : "";

        if (!categoryId || typeof body.isActive !== "boolean") {
            return NextResponse.json(
                { message: "Invalid category or publishing status" },
                { status: 400 }
            );
        }

        const name =
            typeof body.name === "string" ? body.name.trim() : "";

        const description =
            typeof body.description === "string"
                ? body.description.trim()
                : "";

        if (!name || name.length > 150 || description.length > 2000) {
            return NextResponse.json(
                { message: "Invalid item name or description" },
                { status: 400 }
            );
        }

        if (
            typeof body.isVegetarian !== "boolean" ||
            typeof body.isVegan !== "boolean"
        ) {
            return NextResponse.json(
                { message: "Invalid dietary options" },
                { status: 400 }
            );
        }

        const priceText = String(body.price ?? "").trim();

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

        const slug = name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        if (!slug) {
            return NextResponse.json(
                { message: "Invalid item name" },
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
                { message: "Category not found for this restaurant" },
                { status: 400 }
            );
        }

        const item = await prisma.menuItem.findFirst({
            where: {
                id,
                tenantId: admin.tenantId,
            },
            select: { id: true },
        });

        if (!item) {
            return NextResponse.json(
                { message: "Menu item not found" },
                { status: 404 }
            );
        }

        const duplicate = await prisma.menuItem.findFirst({
            where: {
                tenantId: admin.tenantId,
                slug,
                NOT: { id },
            },
            select: { id: true },
        });

        if (duplicate) {
            return NextResponse.json(
                { message: "Another item already has this name" },
                { status: 409 }
            );
        }

        // Scope the write to the authenticated tenant.
        const result = await prisma.menuItem.updateMany({
            where: {
                id,
                tenantId: admin.tenantId,
            },
            data: {
                name,
                slug,
                description: description || null,
                priceCents,
                categoryId,
                isActive: body.isActive,
                isVegetarian: body.isVegetarian || body.isVegan,
                isVegan: body.isVegan,
            },
        });

        if (result.count !== 1) {
            return NextResponse.json(
                { message: "Menu item no longer exists" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Menu item updated successfully",
        });
    } catch (error) {
        // Prisma unique constraint violation, including concurrent edits.
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { message: "Another item already has this name" },
                { status: 409 }
            );
        }

        console.error("PATCH menu item failed:", error);

        return NextResponse.json(
            { message: "Failed to update menu item" },
            { status: 500 }
        );
    }
}
