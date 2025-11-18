export const EnvUtils = {
  /**
   * Parses a boolean environment variable.
   * Returns true for '1', 'true', 'yes', 'on' (case-insensitive).
   * Returns defaultValue if the variable is undefined or empty.
   */
  getBoolean(key: string, defaultValue = false): boolean {
    const val = process.env[key]?.toLowerCase().trim();
    if (!val) return defaultValue;
    return this.isTrue(val);
  },

  /**
   * Checks if a string value represents a true boolean.
   */
  isTrue(val: string): boolean {
    return ['1', 'true', 'yes', 'on'].includes(val);
  },

  /**
   * Parses a string environment variable.
   * Returns defaultValue if the variable is undefined.
   */
  getString(key: string, defaultValue = ''): string {
    return process.env[key] || defaultValue;
  },

  /**
   * Parses an integer environment variable.
   * Returns defaultValue if the variable is undefined or not a valid number.
   */
  getInt(key: string, defaultValue: number): number {
    const val = process.env[key];
    if (!val) return defaultValue;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
};
