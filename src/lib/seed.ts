import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.env.SEED_EMAIL ?? "admin@socialpulse.app";
  const password = process.env.SEED_PASSWORD ?? "password123";
  const name = process.env.SEED_NAME ?? "Agency Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping seed.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: "ADMIN" },
  });

  console.log(`Created admin user: ${user.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
