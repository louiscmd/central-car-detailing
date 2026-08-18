import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "warsawmedia.pl@gmail.com";
  const password = "Admin1234!";
  const name = "Louis";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("User already exists:", email);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, password: hash, role: "ADMIN" },
  });

  console.log("✅ Admin account created:");
  console.log("   Email:   ", email);
  console.log("   Password:", password);
  console.log("   ID:      ", user.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
