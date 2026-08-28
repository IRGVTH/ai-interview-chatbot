import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      role: Role.ADMIN,
    },
    create: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin",
      role: Role.ADMIN,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });