
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const tenantSlug = session?.user?.tenantSlug;

        if (!session?.user || !tenantSlug) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const name = typeof body.name === "string"
            ? body.name.trim()
            : "";

        if (!name || name.length > 100) {
            return NextResponse.json(
                { message: "Category name must be 1–100 characters" },
                { status: 400 }
            );
        }

        const admin = await prisma.adminUser.findFirst({
            where: {
                email: session.user.email ?? "",
                isActive: true,
                tenant: {
                    slug: tenantSlug,
                },
            },
            select: {
                tenantId: true,
            },
        });

        if (!admin) {
            return NextResponse.json(
                { message: "Administrator not authorized" },
                { status: 403 }
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
                { message: "Invalid category name" },
                { status: 400 }
            );
        }

        const existing = await prisma.menuCategory.findUnique({
            where: {
                tenantId_slug: {
                    tenantId: admin.tenantId,
                    slug,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { message: "This category already exists" },
                { status: 409 }
            );
        }

        const category = await prisma.menuCategory.create({
            data: {
                tenantId: admin.tenantId,
                name,
                slug,
                isActive: true,
            },
        });

        return NextResponse.json(
            { success: true, category },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/admin/menu/categories failed:", error);

        return NextResponse.json(
            { message: "Failed to create category" },
            { status: 500 }
        );
    }
}
