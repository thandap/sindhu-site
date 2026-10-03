import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcrypt";

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

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.tenant.upsert({
    where: { slug: "sindhu" },
    update: {
      name: "Sindhu Indian Restaurant",
      brandName: "SINDHU",
      businessType: "restaurant",
      subdomain: "sindhu",
      domain: "sindhuindian.com",
      isActive: true,
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      platformFeeBps: 300,
      config: {
        currency: "usd",
        timezone: "America/Detroit",
      },
    },
    create: {
      slug: "sindhu",
      name: "Sindhu Indian Restaurant",
      brandName: "SINDHU",
      businessType: "restaurant",
      subdomain: "sindhu",
      domain: "sindhuindian.com",
      isActive: true,
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      platformFeeBps: 300,
      config: {
        currency: "usd",
        timezone: "America/Detroit",
      },
    },
  });

  await prisma.tenant.upsert({
    where: { slug: "elitecaters" },
    update: {
      name: "Elite Caters",
      brandName: "Elite Caters",
      businessType: "catering",
      subdomain: "elitecaters",
      domain: "elitecaters.com",
      isActive: true,
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      platformFeeBps: 300,
      config: {
        currency: "usd",
        timezone: "America/Detroit",
      },
    },
    create: {
      slug: "elitecaters",
      name: "Elite Caters",
      brandName: "Elite Caters",
      businessType: "catering",
      subdomain: "elitecaters",
      domain: "elitecaters.com",
      isActive: true,
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      platformFeeBps: 300,
      config: {
        currency: "usd",
        timezone: "America/Detroit",
      },
    },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  const sindhu = await prisma.tenant.findUnique({
    where: { slug: "sindhu" },
  });

  const elite = await prisma.tenant.findUnique({
    where: { slug: "elitecaters" },
  });

  if (!sindhu || !elite) {
    throw new Error("Tenant records not found after upsert");
  }

  await prisma.adminUser.upsert({
    where: { email: "admin@sindhu.com" },
    update: {
      passwordHash,
      tenantId: sindhu.id,
      role: "admin",
      isActive: true,
      name: "Sindhu Admin",
    },
    create: {
      name: "Sindhu Admin",
      email: "admin@sindhu.com",
      passwordHash,
      tenantId: sindhu.id,
      role: "admin",
      isActive: true,
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "admin@elite.com" },
    update: {
      passwordHash,
      tenantId: elite.id,
      role: "admin",
      isActive: true,
      name: "Elite Admin",
    },
    create: {
      name: "Elite Admin",
      email: "admin@elite.com",
      passwordHash,
      tenantId: elite.id,
      role: "admin",
      isActive: true,
    },
  });

  const categories = await Promise.all([
    prisma.menuCategory.upsert({
      where: { tenantId_slug: { tenantId: sindhu.id, slug: "biryani" } },
      update: {
        name: "Biryani",
        sortOrder: 1,
        isActive: true,
      },
      create: {
        tenantId: sindhu.id,
        name: "Biryani",
        slug: "biryani",
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.menuCategory.upsert({
      where: { tenantId_slug: { tenantId: sindhu.id, slug: "breads" } },
      update: {
        name: "Breads",
        sortOrder: 2,
        isActive: true,
      },
      create: {
        tenantId: sindhu.id,
        name: "Breads",
        slug: "breads",
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.menuCategory.upsert({
      where: { tenantId_slug: { tenantId: sindhu.id, slug: "curries" } },
      update: {
        name: "Curries",
        sortOrder: 3,
        isActive: true,
      },
      create: {
        tenantId: sindhu.id,
        name: "Curries",
        slug: "curries",
        sortOrder: 3,
        isActive: true,
      },
    }),
  ]);

  await prisma.menuItem.upsert({
    where: { tenantId_slug: { tenantId: sindhu.id, slug: "chicken-biryani" } },
    update: {
      categoryId: categories[0].id,
      name: "Chicken Biryani",
      description: "Aromatic basmati rice with chicken and spices",
      priceCents: 1499,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
    create: {
      tenantId: sindhu.id,
      categoryId: categories[0].id,
      name: "Chicken Biryani",
      slug: "chicken-biryani",
      description: "Aromatic basmati rice with chicken and spices",
      priceCents: 1499,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.upsert({
    where: { tenantId_slug: { tenantId: sindhu.id, slug: "veg-biryani" } },
    update: {
      categoryId: categories[0].id,
      name: "Veg Biryani",
      description: "Vegetable biryani with rich spices",
      priceCents: 1299,
      isAvailable: true,
      isActive: true,
      sortOrder: 2,
    },
    create: {
      tenantId: sindhu.id,
      categoryId: categories[0].id,
      name: "Veg Biryani",
      slug: "veg-biryani",
      description: "Vegetable biryani with rich spices",
      priceCents: 1299,
      isAvailable: true,
      isActive: true,
      sortOrder: 2,
    },
  });

  await prisma.menuItem.upsert({
    where: { tenantId_slug: { tenantId: sindhu.id, slug: "garlic-naan" } },
    update: {
      categoryId: categories[1].id,
      name: "Garlic Naan",
      description: "Fresh naan with garlic",
      priceCents: 399,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
    create: {
      tenantId: sindhu.id,
      categoryId: categories[1].id,
      name: "Garlic Naan",
      slug: "garlic-naan",
      description: "Fresh naan with garlic",
      priceCents: 399,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.upsert({
    where: { tenantId_slug: { tenantId: sindhu.id, slug: "butter-chicken" } },
    update: {
      categoryId: categories[2].id,
      name: "Butter Chicken",
      description: "Creamy tomato-based chicken curry",
      priceCents: 1599,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
    create: {
      tenantId: sindhu.id,
      categoryId: categories[2].id,
      name: "Butter Chicken",
      slug: "butter-chicken",
      description: "Creamy tomato-based chicken curry",
      priceCents: 1599,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log("Tenants, admin users, and Sindhu menu seeded");
  console.log({
    sindhuAdmin: "admin@sindhu.com / Admin@123",
    eliteAdmin: "admin@elite.com / Admin@123",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });