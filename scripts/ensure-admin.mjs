import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const ADMIN_EMAIL = "admin@cardcap.de";
const ADMIN_NAME = "Admin";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl.startsWith("postgres")) {
    console.log("ensure-admin: Keine PostgreSQL-Datenbank konfiguriert, übersprungen.");
    return;
  }

  const password = process.env.SITE_GATE_PASSWORD?.trim();
  if (!password) {
    console.log("ensure-admin: SITE_GATE_PASSWORD fehlt, übersprungen.");
    return;
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    const hashed = await bcrypt.hash(password, 12);

    if (existing) {
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          name: ADMIN_NAME,
          password: hashed,
        },
      });
      console.log("ensure-admin: Admin-Konto aktualisiert.");
      return;
    }

    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password: hashed,
      },
    });
    console.log("ensure-admin: Admin-Konto erstellt.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("ensure-admin: Fehler", error);
  process.exit(1);
});