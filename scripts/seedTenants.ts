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
    update: {},
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
    update: {},
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
    update: {},
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
    update: {},
    create: {
      name: "Elite Admin",
      email: "admin@elite.com",
      passwordHash,
      tenantId: elite.id,
      role: "admin",
      isActive: true,
    },
  });

  console.log("Tenants and admin users seeded");
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