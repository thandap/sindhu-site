
import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../lib/db/prisma";

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || "Cohesion Admin";

  if (!email || !password) {
    throw new Error("Platform admin email and password are required.");
  }

  if (password.length < 16) {
    throw new Error("Use a password with at least 16 characters.");
  }

  const existing = await prisma.platformAdmin.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("Platform administrator already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.platformAdmin.create({
    data: {
      name,
      email,
      passwordHash,
      role: "platform-admin",
      isActive: true,
    },
  });

  console.log("Platform administrator created:", admin.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
