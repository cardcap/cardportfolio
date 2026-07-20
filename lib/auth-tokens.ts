import "server-only";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resetIdentifier(email: string): string {
  return `reset:${email.trim().toLowerCase()}`;
}

/** Create a password-reset token (plain token returned once for the email link). */
export async function createPasswordResetToken(
  email: string,
  ttlMinutes = 60,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const identifier = resetIdentifier(normalized);
  const plain = randomBytes(32).toString("hex");
  const token = hashToken(plain);
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // Remove previous reset tokens for this email
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return plain;
}

export async function consumePasswordResetToken(
  email: string,
  plainToken: string,
): Promise<boolean> {
  const identifier = resetIdentifier(email);
  const token = hashToken(plainToken);

  const row = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier, token },
    },
  });

  if (!row) return false;
  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return false;
  }

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier, token } },
  });
  return true;
}
