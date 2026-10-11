import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { AuthModuleError } from "./auth-errors.js";

const KEY_LENGTH = 64;

/**
 * Password hashing helper. Uses Node scrypt with per-password salt and constant-time compare.
 */
export class PasswordService {
  hashPassword(password: string): string {
    this.assertPasswordPolicy(password);

    const salt = randomBytes(16).toString("hex");
    const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");

    return `scrypt$${salt}$${key}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [algorithm, salt, key] = storedHash.split("$");
    if (algorithm !== "scrypt" || salt === undefined || key === undefined) {
      throw new AuthModuleError("VALIDATION_ERROR", "Unsupported password hash format.");
    }

    const expected = Buffer.from(key, "hex");
    const actual = scryptSync(password, salt, KEY_LENGTH);

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private assertPasswordPolicy(password: string): void {
    if (password.length < 8) {
      throw new AuthModuleError("VALIDATION_ERROR", "Password must contain at least 8 characters.");
    }
  }
}
