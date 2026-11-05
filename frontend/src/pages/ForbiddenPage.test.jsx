import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ForbiddenPage from './ForbiddenPage.jsx';

afterEach(cleanup);

describe('ForbiddenPage', () => {
  it('explica el problema y ofrece volver al inicio', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Acceso denegado' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Volver al inicio' }).getAttribute('href'),
    ).toBe('/');
  });
});
