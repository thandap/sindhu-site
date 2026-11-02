
import "dotenv/config";
import { prisma } from "../lib/db/prisma";

const apply = process.argv.includes("--apply");

async function main() {
  const [west, east] = await Promise.all([
    prisma.tenant.findUnique({
      where: { slug: "sindhu-west" },
      select: { id: true },
    }),
    prisma.tenant.findUnique({
      where: { slug: "sindhu-east" },
      select: { id: true },
    }),
  ]);

  if (!west || !east) {
    throw new Error("Sindhu West or East tenant not found");
  }

  const westItems = await prisma.menuItem.findMany({
    where: { tenantId: west.id },
    select: {
      slug: true,
      image: true,
      description: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const item of westItems) {
    if (!item.image && !item.description) {
      skipped++;
      continue;
    }

    const eastItem = await prisma.menuItem.findUnique({
      where: {
        tenantId_slug: {
          tenantId: east.id,
          slug: item.slug,
        },
      },
      select: {
        id: true,
        image: true,
        description: true,
      },
    });

    if (!eastItem) {
      console.log(`MISSING EAST ITEM: ${item.slug}`);
      skipped++;
      continue;
    }

    const changes = {
      ...(item.image && !eastItem.image
        ? { image: item.image }
        : {}),
      ...(item.description && !eastItem.description
        ? { description: item.description }
        : {}),
    };

    if (Object.keys(changes).length === 0) {
      skipped++;
      continue;
    }

    console.log(
      `${apply ? "UPDATE" : "WOULD UPDATE"}: ${item.slug}`
    );

    if (apply) {
      await prisma.menuItem.update({
        where: { id: eastItem.id },
        data: changes,
      });
    }

    updated++;
  }

  console.log(
    `${apply ? "Updated" : "Would update"}: ${updated}, Skipped: ${skipped}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
