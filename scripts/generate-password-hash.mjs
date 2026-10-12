import { scryptSync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const password = await rl.question("Masukkan password admin DaveTier: ");

  if (password.length < 12) {
    throw new Error("Password harus minimal 12 karakter.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  console.log("\nADMIN_PASSWORD_HASH=");
  console.log(`${salt}:${hash}`);
} finally {
  rl.close();
}
