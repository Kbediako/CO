import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvUtils } from '../config/env.js';

describe('EnvUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBoolean', () => {
    it('returns true for "1"', () => {
      process.env.TEST_FLAG = '1';
      expect(EnvUtils.getBoolean('TEST_FLAG')).toBe(true);
    });

    it('returns true for "true" (case insensitive)', () => {
      process.env.TEST_FLAG = 'True';
      expect(EnvUtils.getBoolean('TEST_FLAG')).toBe(true);
    });

    it('returns true for "on"', () => {
      process.env.TEST_FLAG = 'on';
      expect(EnvUtils.getBoolean('TEST_FLAG')).toBe(true);
    });

    it('returns true for "yes"', () => {
      process.env.TEST_FLAG = 'yes';
      expect(EnvUtils.getBoolean('TEST_FLAG')).toBe(true);
    });

    it('returns false for "0"', () => {
      process.env.TEST_FLAG = '0';
      expect(EnvUtils.getBoolean('TEST_FLAG')).toBe(false);
    });

    it('returns false for "false"', () => {
      process.env.TEST_FLAG = 'false';
      expect(EnvUtils.getBoolean('TEST_FLAG')).toBe(false);
    });

    it('returns default value if undefined', () => {
      expect(EnvUtils.getBoolean('NON_EXISTENT', true)).toBe(true);
      expect(EnvUtils.getBoolean('NON_EXISTENT', false)).toBe(false);
    });
    
    it('returns false for random string even if default is true (wait, verify behavior)', () => {
       // Implementation:
       // const val = process.env[key]?.toLowerCase().trim();
       // if (!val) return defaultValue;
       // return ['1', 'true', 'yes', 'on'].includes(val);
       
       process.env.TEST_FLAG = 'garbage';
       // val is 'garbage'. Not in list. returns false.
       expect(EnvUtils.getBoolean('TEST_FLAG', true)).toBe(false);
    });
  });

  describe('getString', () => {
    it('returns value if present', () => {
      process.env.TEST_STR = 'hello';
      expect(EnvUtils.getString('TEST_STR')).toBe('hello');
    });

    it('returns default if missing', () => {
      expect(EnvUtils.getString('MISSING', 'def')).toBe('def');
    });
  });

  describe('getInt', () => {
    it('returns parsed integer', () => {
      process.env.TEST_INT = '123';
      expect(EnvUtils.getInt('TEST_INT', 0)).toBe(123);
    });

    it('returns default if invalid', () => {
      process.env.TEST_INT = 'abc';
      expect(EnvUtils.getInt('TEST_INT', 42)).toBe(42);
    });
    
    it('returns default if missing', () => {
      expect(EnvUtils.getInt('MISSING', 42)).toBe(42);
    });
  });
  
  describe('isTrue', () => {
     it('returns true for valid truthy strings', () => {
       expect(EnvUtils.isTrue('1')).toBe(true);
       expect(EnvUtils.isTrue('true')).toBe(true);
       expect(EnvUtils.isTrue('on')).toBe(true);
       expect(EnvUtils.isTrue('yes')).toBe(true);
     });
     
     it('returns false for others', () => {
       expect(EnvUtils.isTrue('0')).toBe(false);
       expect(EnvUtils.isTrue('false')).toBe(false);
       expect(EnvUtils.isTrue('random')).toBe(false);
     });
  });
});
