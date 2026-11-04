import { describe, expect, it } from 'vitest';
import { isAliasAllowed } from '@web-platform/shared/alias-policy.js';

describe('política de alias', () => {
  it('ignora mayúsculas, tildes y puntuación en las palabras bloqueadas', () => {
    expect(isAliasAllowed('Púta!!!')).toBe(false);
    expect(isAliasAllowed('p.u.t.a')).toBe(false);
    expect(isAliasAllowed('coño')).toBe(false);
    expect(isAliasAllowed('fuck-you')).toBe(false);
  });

  it('permite alias que no contienen palabras bloqueadas', () => {
    expect(isAliasAllowed('persona-amable')).toBe(true);
    expect(isAliasAllowed('computadora')).toBe(true);
    expect(isAliasAllowed('icono')).toBe(true);
  });

  it('detecta palabras bloqueadas unidas a números o letras', () => {
    expect(isAliasAllowed('mierda123')).toBe(false);
    expect(isAliasAllowed('xputax')).toBe(false);
  });
});
