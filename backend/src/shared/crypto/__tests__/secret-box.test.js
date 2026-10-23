import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, isEncrypted } from '../secret-box.js';

describe('secret-box', () => {
  it('cifra y descifra un secreto', () => {
    const stored = encryptSecret('JBSWY3DPEHPK3PXP');

    expect(stored).not.toContain('JBSWY3DPEHPK3PXP');
    expect(stored.startsWith('v1:')).toBe(true);
    expect(isEncrypted(stored)).toBe(true);
    expect(decryptSecret(stored)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('produce un resultado distinto cada vez (IV aleatorio)', () => {
    expect(encryptSecret('JBSWY3DPEHPK3PXP')).not.toBe(
      encryptSecret('JBSWY3DPEHPK3PXP'),
    );
  });

  it('devuelve tal cual un valor sin cifrar (compatibilidad)', () => {
    expect(isEncrypted('JBSWY3DPEHPK3PXP')).toBe(false);
    expect(decryptSecret('JBSWY3DPEHPK3PXP')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('lanza error si el contenido está manipulado', () => {
    const [version, iv, tag, data] = encryptSecret('JBSWY3DPEHPK3PXP').split(':');
    const changedFirstChar = data[0] === 'A' ? 'B' : 'A';
    const tampered = [version, iv, tag, `${changedFirstChar}${data.slice(1)}`].join(':');

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('cabe en VARCHAR(191)', () => {
    expect(encryptSecret('A'.repeat(32)).length).toBeLessThan(191);
  });
});
