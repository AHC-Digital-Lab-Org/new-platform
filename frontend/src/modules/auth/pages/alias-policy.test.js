import { describe, expect, it } from 'vitest';
import { isAliasAllowed } from '../../../../../shared/alias-policy.js';

describe('política de alias', () => {
  it('ignora mayúsculas, tildes y puntuación en las palabras bloqueadas', () => {
    expect(isAliasAllowed('Púta!!!')).toBe(false);
    expect(isAliasAllowed('p.u.t.a')).toBe(false);
    expect(isAliasAllowed('fuck-you')).toBe(false);
  });

  it('permite alias que no contienen palabras bloqueadas', () => {
    expect(isAliasAllowed('persona-amable')).toBe(true);
    expect(isAliasAllowed('computadora')).toBe(true);
  });
});
