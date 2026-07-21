import { describe, it, expect } from 'vitest';
import {
  formatUsdcAmount,
  parseUsdcAmount,
  hashSecret,
  generateSecret,
  buildClaimUri,
} from '@/server/service/gift.service';

describe('formatUsdcAmount', () => {
  it('formats whole numbers correctly', () => {
    expect(formatUsdcAmount('20000000')).toBe('20.00');
  });

  it('formats fractional amounts correctly', () => {
    expect(formatUsdcAmount('1050000')).toBe('1.05');
  });

  it('formats zero correctly', () => {
    expect(formatUsdcAmount('0')).toBe('0.00');
  });

  it('formats large amounts correctly', () => {
    expect(formatUsdcAmount('1000000000000')).toBe('1000000.00');
  });

  it('removes trailing zeros from fractions', () => {
    // 10.500000 → trailing zeros removed → "10.5"
    expect(formatUsdcAmount('10500000')).toBe('10.5');
  });
});

describe('parseUsdcAmount', () => {
  it('parses whole USDC amount', () => {
    expect(parseUsdcAmount('20')).toBe('20000000');
  });

  it('parses decimal USDC amount', () => {
    expect(parseUsdcAmount('1.05')).toBe('1050000');
  });

  it('parses zero', () => {
    expect(parseUsdcAmount('0')).toBe('0');
  });

  it('parses amount with 6 decimal places', () => {
    expect(parseUsdcAmount('1.000001')).toBe('1000001');
  });

  it('parses amount with 2 decimal places', () => {
    expect(parseUsdcAmount('10.50')).toBe('10500000');
  });
});

describe('hashSecret', () => {
  it('returns a 64-char hex string (sha256)', () => {
    const hash = hashSecret('test-secret');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('is deterministic', () => {
    const h1 = hashSecret('hello');
    const h2 = hashSecret('hello');
    expect(h1).toBe(h2);
  });

  it('different inputs produce different hashes', () => {
    expect(hashSecret('foo')).not.toBe(hashSecret('bar'));
  });

  it('matches known SHA-256 value', () => {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(hashSecret('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('generateSecret', () => {
  it('generates a non-empty string', () => {
    const s = generateSecret();
    expect(s.length).toBeGreaterThan(0);
  });

  it('generates unique secrets', () => {
    const secrets = new Set(Array.from({ length: 10 }, () => generateSecret()));
    expect(secrets.size).toBe(10);
  });

  it('generates hex string', () => {
    const s = generateSecret();
    expect(/^[0-9a-f]+$/.test(s)).toBe(true);
  });
});

describe('buildClaimUri', () => {
  it('builds a claim URL with giftId and secret', () => {
    const url = buildClaimUri('abc-123', 'mysecret', 'http://localhost:3002');
    expect(url).toContain('giftId=abc-123');
    expect(url).toContain('secret=mysecret');
    expect(url).toContain('/claim');
  });

  it('includes the base URL', () => {
    const url = buildClaimUri('id', 'secret', 'https://angpao.app');
    expect(url.startsWith('https://angpao.app')).toBe(true);
  });
});
