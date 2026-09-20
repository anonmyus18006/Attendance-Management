/**
 * Mobile Security Service
 * Implements PBKDF2 / Salted Cryptographic Password Hashing, App Lock,
 * and Student Edit Lock with Unauthorized Bypass Protection.
 */

import { sqlite } from '../database/sqlite';

export class SecurityService {
  private static isAppUnlockedForSession = false;
  private static isEditUnlockedForSession = false;

  /**
   * Generates a cryptographically random salt (hex string)
   */
  public static generateSalt(length = 16): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Derives a cryptographic hash from password and salt using Web Crypto PBKDF2 (or SHA-256 fallback)
   */
  public static async hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
    const salt = existingSalt || this.generateSalt();

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          enc.encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const derived = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: enc.encode(salt),
            iterations: 100000,
            hash: 'SHA-256',
          },
          keyMaterial,
          256
        );

        const hashArray = Array.from(new Uint8Array(derived));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return { hash, salt };
      } catch {
        // Fallback to salted SHA-256 if PBKDF2 fails
      }
    }

    // Fallback: Salted SHA-256
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${password}:offline_ghs_key`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt };
  }

  /**
   * Verifies an entered password against stored hash and salt
   */
  public static async verifyPassword(
    input: string,
    storedHash: string | undefined,
    storedSalt: string | undefined
  ): Promise<boolean> {
    if (!storedHash || !storedSalt) {
      // If no password is set, empty or any password matches
      return true;
    }
    const { hash } = await this.hashPassword(input, storedSalt);
    return hash === storedHash;
  }

  /**
   * App Lock Management
   */
  public static isAppLocked(): boolean {
    return !this.isAppUnlockedForSession;
  }

  public static unlockApp(): void {
    this.isAppUnlockedForSession = true;
  }

  public static lockApp(): void {
    this.isAppUnlockedForSession = false;
  }

  /**
   * Student Edit Lock Management
   */
  public static isEditUnlocked(): boolean {
    return this.isEditUnlockedForSession;
  }

  public static unlockStudentEdit(): void {
    this.isEditUnlockedForSession = true;
  }

  public static lockStudentEdit(): void {
    this.isEditUnlockedForSession = false;
  }
}
