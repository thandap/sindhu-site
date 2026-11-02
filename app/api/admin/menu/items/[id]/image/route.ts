
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function detectImageType(bytes: Buffer): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "png";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

async function getAuthorizedItem(id: string) {
  const session = await getServerSession(authOptions);

  const email = session?.user?.email;
  const tenantSlug = session?.user?.tenantSlug;

  if (!email || !tenantSlug) {
    return { status: 401 as const };
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
    return { status: 403 as const };
  }

  const item = await prisma.menuItem.findFirst({
    where: {
      id,
      tenantId: admin.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      image: true,
    },
  });

  if (!item) {
    return { status: 404 as const };
  }

  return { item };
}

function errorResponse(status: 401 | 403 | 404) {
  const message =
    status === 401
      ? "Unauthorized"
      : status === 403
        ? "Administrator not authorized"
        : "Menu item not found";

  return NextResponse.json({ message }, { status });
}

function imagePublicId(tenantId: string, itemId: string) {
  return `resto/${tenantId}/menu/${itemId}`;
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await getAuthorizedItem(id);

    if (!auth.item) {
      return errorResponse(auth.status!);
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { message: "Image storage is not configured" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please select an image" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { message: "Image must be smaller than 5 MB" },
        { status: 400 }
      );
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      return NextResponse.json(
        { message: "Only JPG, PNG, and WebP are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const format = detectImageType(buffer);

    if (!format) {
      return NextResponse.json(
        { message: "Invalid image file" },
        { status: 400 }
      );
    }

    const publicId = imagePublicId(
      auth.item.tenantId,
      auth.item.id
    );

    const upload = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            overwrite: true,
            invalidate: true,
            resource_type: "image",
            format,
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error("Upload failed"));
            } else {
              resolve({ secure_url: result.secure_url });
            }
          }
        );

        stream.end(buffer);
      }
    );

    const updated = await prisma.menuItem.updateMany({
      where: {
        id: auth.item.id,
        tenantId: auth.item.tenantId,
      },
      data: {
        image: upload.secure_url,
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json(
        { message: "Menu item no longer exists" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      image: upload.secure_url,
      message: "Dish picture uploaded successfully",
    });
  } catch (error) {
    console.error("Menu image upload failed:", error);

    return NextResponse.json(
      { message: "Unable to upload dish picture" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await getAuthorizedItem(id);

    if (!auth.item) {
      return errorResponse(auth.status!);
    }

    const publicId = imagePublicId(
      auth.item.tenantId,
      auth.item.id
    );

    // Remove our managed Cloudinary image before clearing the DB URL.
    // An image uploaded by a different system is not deleted here.
    if (auth.item.image) {
      const managedPrefix =
        `https://res.cloudinary.com/` +
        `${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;

      const encodedPublicId = publicId
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const imagePath = auth.item.image.startsWith(managedPrefix)
        ? auth.item.image.slice(managedPrefix.length)
        : "";

      const isOwnManagedImage =
        imagePath.startsWith(`${encodedPublicId}.`) ||
        /^v\d+\//.test(imagePath) &&
        imagePath.replace(/^v\d+\//, "").startsWith(`${encodedPublicId}.`);

      if (isOwnManagedImage) {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
          invalidate: true,
        });

        if (result.result !== "ok" && result.result !== "not found") {
          throw new Error("Cloudinary image deletion failed");
        }
      }
    }

    await prisma.menuItem.updateMany({
      where: {
        id: auth.item.id,
        tenantId: auth.item.tenantId,
      },
      data: {
        image: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Dish picture removed",
    });
  } catch (error) {
    console.error("Menu image removal failed:", error);

    return NextResponse.json(
      { message: "Unable to remove dish picture" },
      { status: 500 }
    );
  }
}
