import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ApiError } from '@/shared/api/client.js';
import { verifyEmail } from '../api.js';
import VerifyEmailPage from './VerifyEmailPage.jsx';

vi.mock('../api.js', () => ({ verifyEmail: vi.fn() }));

const renderAt = (url) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </StrictMode>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VerifyEmailPage', () => {
  it('verifica una sola vez aunque StrictMode duplique el efecto', async () => {
    verifyEmail.mockResolvedValue({ user: {} });
    renderAt('/verify-email?token=abc');

    expect(await screen.findByText('Email verificado')).toBeTruthy();
    expect(verifyEmail).toHaveBeenCalledTimes(1);
    expect(verifyEmail).toHaveBeenCalledWith('abc');
  });

  it('token inválido: explica el problema y ofrece pedir otro enlace', async () => {
    verifyEmail.mockRejectedValue(
      new ApiError('x', {
        status: 400,
        code: 'INVALID_VERIFICATION_TOKEN',
      }),
    );
    renderAt('/verify-email?token=abc');

    expect(await screen.findByText('No se pudo verificar el email')).toBeTruthy();
    expect(screen.getByText('Solicitar un enlace nuevo')).toBeTruthy();
  });

  it('sin token no llama a la API', () => {
    renderAt('/verify-email');

    expect(screen.getByText('Enlace incompleto')).toBeTruthy();
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
