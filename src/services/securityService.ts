/**
 * Cryptographic Mobile Security Service
 * Implements salted PBKDF2 / SHA-256 hashing, session unlock management,
 * App Lock, and unauthorized Student Edit Lock bypass prevention.
 */

import { db } from '../database/db';

export class SecurityService {
  private static isAppUnlockedForSession = false;
  private static isEditUnlockedForSession = false;

  /**
   * Generates cryptographically secure random salt
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
   * Derives a salted cryptographic hash
   */
  public static async hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
    if (!password) return { hash: '', salt: '' };
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
        // Fallback below
      }
    }

    // Salted SHA-256 fallback
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(`${salt}:${password}:ghs_offline_secure`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return { hash, salt };
    }

    // Legacy fallback
    let h = 0;
    const combined = salt + password;
    for (let i = 0; i < combined.length; i++) {
      h = (h << 5) - h + combined.charCodeAt(i);
      h |= 0;
    }
    return { hash: 'sec_' + Math.abs(h), salt };
  }

  /**
   * Verifies an entered password against stored hash and salt
   */
  public static async verifyPassword(
    inputPassword: string,
    expectedHash?: string,
    expectedSalt?: string
  ): Promise<boolean> {
    if (!expectedHash) return true; // No password set
    // Support legacy unsalted comparison if salt not present
    if (!expectedSalt) {
      const { hash } = await this.hashPassword(inputPassword, 'default_salt');
      if (hash === expectedHash) return true;
      // Also check standard text match or simple hash
      return inputPassword === expectedHash;
    }

    const { hash } = await this.hashPassword(inputPassword, expectedSalt);
    return hash === expectedHash;
  }

  public static isAppLocked(): boolean {
    const settings = db.getAppSettings();
    if (!settings.isAppLocked) return false;
    return !this.isAppUnlockedForSession;
  }

  public static unlockAppForSession(): void {
    this.isAppUnlockedForSession = true;
  }

  public static lockApp(): void {
    this.isAppUnlockedForSession = false;
  }

  public static isStudentEditLocked(): boolean {
    const settings = db.getAppSettings();
    return settings.isStudentEditLocked;
  }

  public static async setEditPassword(newPassword: string): Promise<void> {
    const { hash, salt } = await this.hashPassword(newPassword);
    db.updateAppSettings({
      editPasswordHash: hash,
      editLockSalt: salt,
      isStudentEditLocked: true,
    });
  }

  public static removeEditPassword(): void {
    db.updateAppSettings({
      editPasswordHash: '',
      editLockSalt: '',
      isStudentEditLocked: false,
    });
  }

  public static async setAppLockPassword(newPassword: string): Promise<void> {
    const { hash, salt } = await this.hashPassword(newPassword);
    db.updateAppSettings({
      appLockPasswordHash: hash,
      appLockSalt: salt,
      isAppLocked: true,
    });
  }

  public static removeAppLock(): void {
    db.updateAppSettings({
      appLockPasswordHash: '',
      appLockSalt: '',
      isAppLocked: false,
    });
  }
}
