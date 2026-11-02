
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  const west = await prisma.tenant.findUnique({
    where: { slug: "sindhu-west" },
  });

  const east = await prisma.tenant.findUnique({
    where: { slug: "sindhu-east" },
  });

  if (!west || !east) {
    throw new Error("Sindhu West or East tenant not found");
  }

  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: west.id },
    include: { items: true },
    orderBy: { sortOrder: "asc" },
  });

  const sourceItemCount = categories.reduce(
    (sum, category) => sum + category.items.length,
    0
  );

  console.log(
    `Source: ${categories.length} categories, ${sourceItemCount} items`
  );

  // Safety: This script only initializes an empty East menu.
  await prisma.$transaction(async (tx) => {
    const existingCategories = await tx.menuCategory.count({
      where: { tenantId: east.id },
    });

    const existingItems = await tx.menuItem.count({
      where: { tenantId: east.id },
    });

    if (existingCategories > 0 || existingItems > 0) {
      throw new Error(
        "East menu is not empty. Copy cancelled to prevent duplicates."
      );
    }

    for (const category of categories) {
      const newCategory = await tx.menuCategory.create({
        data: {
          tenantId: east.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        },
      });

      for (const item of category.items) {
        await tx.menuItem.create({
          data: {
            tenantId: east.id,
            categoryId: newCategory.id,
            name: item.name,
            slug: item.slug,
            description: item.description,
            image: item.image,
            priceCents: item.priceCents,
            compareAtCents: item.compareAtCents,
            sku: item.sku,
            isActive: item.isActive,
            isAvailable: item.isAvailable,
            isFeatured: item.isFeatured,
            isVegetarian: item.isVegetarian,
            isVegan: item.isVegan,
            isGlutenFree: item.isGlutenFree,
            spiceLevel: item.spiceLevel,
            sortOrder: item.sortOrder,
            metadata:
              item.metadata === null
                ? Prisma.DbNull
                : (item.metadata as Prisma.InputJsonValue),
          },
        });
      }
    }
  }, {
    maxWait: 10000,
    timeout: 60000,
  });

  console.log("Sindhu East menu copied successfully!");

  const [eastCategories, eastItems] = await Promise.all([
    prisma.menuCategory.count({
      where: { tenantId: east.id },
    }),
    prisma.menuItem.count({
      where: { tenantId: east.id },
    }),
  ]);

  console.log(
    `East now has ${eastCategories} categories and ${eastItems} items`
  );
}
main()
  .catch((error) => {
    console.error("Menu copy failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
