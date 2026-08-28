import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../apps/api/src/generated/prisma/client";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { env } from "node:process";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const hashedPassword = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.user.upsert({
  where: { email: "admin@example.com" },
  update: {
    name: "Admin",
    password: hashedPassword,
    role: "ADMIN",
  },
  create: {
    email: "admin@example.com",
    name: "Admin",
    password: hashedPassword,
    role: "ADMIN",
  },
});

  console.log("Created admin:", admin);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });