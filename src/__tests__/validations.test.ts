import { describe, it, expect } from 'vitest';
import { validateRFC, validateCURP, validateEmail, sanitizeString, generateId } from '../lib/validations';

describe('Validations', () => {
  describe('validateRFC', () => {
    it('should validate correct RFC format', () => {
      expect(validateRFC('GODE561231GR8')).toBe(true);
      expect(validateRFC('XAXX010101000')).toBe(true);
      expect(validateRFC('CACX7605101P8')).toBe(true);
    });

    it('should reject invalid RFC', () => {
      expect(validateRFC('')).toBe(false);
      expect(validateRFC('ABC')).toBe(false);
      expect(validateRFC('1234567890')).toBe(false);
    });
  });

  describe('validateCURP', () => {
    it('should validate correct CURP format', () => {
      expect(validateCURP('GARC850101HDFRRL01')).toBe(true);
      expect(validateCURP('LOOA531113HTCPBN07')).toBe(true);
    });

    it('should reject invalid CURP', () => {
      expect(validateCURP('')).toBe(false);
      expect(validateCURP('123')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.mx')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim and remove angle brackets', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('<script>')).toBe('script');
      expect(sanitizeString('normal text')).toBe('normal text');
    });
  });

  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });
});
