import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashed = await bcrypt.hash("WarsawMedia2026", 12);
  await prisma.user.update({
    where: { email: "admin@socialpulse.app" },
    data: {
      email: "warsawmedia.pl@gmail.com",
      password: hashed,
    },
  });
  console.log("✓ Credentials updated");
  console.log("  Email:    warsawmedia.pl@gmail.com");
  console.log("  Password: WarsawMedia2026");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
