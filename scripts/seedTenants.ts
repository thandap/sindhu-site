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
      domain: "sindhu.com",
      isActive: true,
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
    },
  });

  const password = await bcrypt.hash("admin123", 10);

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
      passwordHash: password,
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
      passwordHash: password,
      tenantId: elite.id,
      role: "admin",
      isActive: true,
    },
  });

  console.log("Tenants and admin users seeded");
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