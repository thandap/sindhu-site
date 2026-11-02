import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("STEP 1: Admin creation script started");

  console.log("STEP 2: Checking database connection");

  await prisma.$connect();

  console.log("STEP 3: Database connected successfully");
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "sindhu-west" },
  });

  if (!tenant) {
    throw new Error("Sindhu West tenant not found");
  }

  const email = "admin-west@sindhu.com";

  const existing = await prisma.adminUser.findFirst({
    where: {
      tenantId: tenant.id,
      email,
    },
  });

  if (existing) {
  const password = process.env.SINDHU_WEST_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SINDHU_WEST_ADMIN_PASSWORD is not set");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.update({
    where: { id: existing.id },
    data: { passwordHash },
  });

  console.log("Sindhu West admin password updated successfully.");
  return;
}

  const password = process.env.SINDHU_WEST_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SINDHU_WEST_ADMIN_PASSWORD is not set");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.create({
  data: {
    tenantId: tenant.id,
    name: "Sindhu West Admin",
    email,
    passwordHash,
    isActive: true,
  },
});

  console.log("Sindhu West admin created successfully.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });