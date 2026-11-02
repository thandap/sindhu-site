
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/db/prisma";
import { cloudinary } from "../lib/cloudinary";

const TENANT_SLUG = "sindhu-west";
const ASSET_DIR = path.resolve("menu-assets/sindhu");

const apply = process.argv.includes("--apply");
const replace = process.argv.includes("--replace");

const descriptions: Record<string, string> = {
    "chicken-tikka-boti":
        "Tender boneless chicken marinated in aromatic spices and grilled until smoky and juicy.",
    "lamb-seekh-kabab":
        "Seasoned minced lamb shaped onto skewers and grilled for a rich, smoky flavor.",
    "big-samosa":
        "Golden, crispy pastry filled with a savory mixture of spiced potatoes and peas.",
    "butter-chicken":
        "Tender chicken simmered in a rich, buttery tomato sauce with aromatic spices.",
    "chicken-tikka-masala":
        "Grilled chicken pieces in a creamy, flavorful tomato-based masala sauce.",
    "chicken-kadai":
        "Chicken cooked with bell peppers, onions, tomatoes, and fragrant spices in a traditional kadai-style sauce.",
};
const slugMapping: Record<string, string> = {
    "big-samosa": "big-samosa-ngcxf0rcmbc62",
    "butter-chicken": "butter-chicken",
    "chicken-kadai": "chicken-kadai-fnyvpx9cjmt8p",
    "chicken-tikka-boti": "chicken-tikka-boti-ffztyz22bjxjj",
    "chicken-tikka-masala": "chicken-tikka-masala-tgamw6520qnp8",
    "lamb-seekh-kabab": "lamb-seekh-kabab-1tgn3hqwdfs1w",
};

async function main() {
    const tenant = await prisma.tenant.findUnique({
        where: { slug: TENANT_SLUG },
        select: { id: true },
    });

    if (!tenant) {
        throw new Error("Sindhu West tenant not found");
    }

    const files = (await fs.readdir(ASSET_DIR))
        .filter((file) => /\.(webp|jpg|jpeg|png)$/i.test(file))
        .sort();

    console.log(apply ? "APPLY MODE" : "PREVIEW MODE");
    console.log(`Found ${files.length} image files`);

    for (const filename of files) {
        const imageName = path.parse(filename).name;
        const slug = slugMapping[imageName] ?? imageName;

        const item = await prisma.menuItem.findUnique({
            where: {
                tenantId_slug: {
                    tenantId: tenant.id,
                    slug,
                },
            },
        });

        if (!item) {
            console.log(`SKIP: ${slug} — no matching menu item`);
            continue;
        }

        if (item.image && !replace) {
            console.log(`SKIP: ${slug} — already has an image`);
            continue;
        }

        const description = descriptions[imageName];

        if (!description) {
            console.log(`SKIP: ${slug} — description not approved`);
            continue;
        }

        console.log(`${apply ? "UPLOAD" : "WOULD UPLOAD"}: ${slug}`);

        if (!apply) continue;

        const publicId = `resto/${tenant.id}/menu/${item.id}`;

        const result = await cloudinary.uploader.upload(
            path.join(ASSET_DIR, filename),
            {
                public_id: publicId,
                overwrite: replace,
                invalidate: replace,
                resource_type: "image",
            }
        );

        await prisma.menuItem.update({
            where: { id: item.id },
            data: {
                image: result.secure_url,
                description,
            },
        });

        console.log(`SUCCESS: ${slug}`);
    }

    console.log("Finished.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
