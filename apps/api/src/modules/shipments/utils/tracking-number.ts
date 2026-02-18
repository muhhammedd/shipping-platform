/**
 * Generates unique tracking numbers
 * Format: SHP-YYYYMMDD-XXXXXX
 * Example: SHP-20260212-A4X9KZ
 */
export class TrackingNumberGenerator {
  /**
   * Generate a tracking number
   * @param tenantSlug - Optional tenant slug for prefix (not used in MVP)
   */
  static generate(tenantSlug?: string): string {
    const prefix = 'SHP';
    const date = this.getDatePart();
    const random = this.getRandomPart();

    return `${prefix}-${date}-${random}`;
  }

  /**
   * Get date portion: YYYYMMDD
   */
  private static getDatePart(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Get random alphanumeric portion: 6 uppercase chars
   */
  private static getRandomPart(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
