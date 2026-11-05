import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@/shared/api/client.js';
import {
  me,
  regenerateRecoveryCodes,
  twoFactorDisable,
  twoFactorEnable,
  twoFactorSetup,
} from '../api.js';
import TwoFactorSection from './TwoFactorSection.jsx';

const auth = vi.hoisted(() => ({
  user: { twoFactorOn: false },
  updateUser: vi.fn(),
}));

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => auth,
}));

vi.mock('../api.js', () => ({
  me: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
  twoFactorDisable: vi.fn(),
  twoFactorEnable: vi.fn(),
  twoFactorSetup: vi.fn(),
}));

beforeEach(() => {
  auth.user = { twoFactorOn: false };
  auth.updateUser.mockImplementation((user) => {
    auth.user = user;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TwoFactorSection', () => {
  it('configura y activa el 2FA, muestra códigos y exige confirmación', async () => {
    twoFactorSetup.mockResolvedValue({
      secret: 'ABCDEF123456',
      qrCode: 'data:image/png;base64,qr',
    });
    twoFactorEnable.mockResolvedValue({
      user: { twoFactorOn: true },
      recoveryCodes: ['abcd-efgh-jkmn'],
    });

    render(<TwoFactorSection />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Activar verificación en dos pasos',
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Activar la verificación en dos pasos',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      'data:image/png;base64,qr',
    );
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos *'), {
      target: { value: '123 456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

    expect(await screen.findByText('abcd-efgh-jkmn')).toBeTruthy();
    expect(twoFactorEnable).toHaveBeenCalledWith('123456');
    expect(screen.getByRole('button', { name: 'Terminar' }).disabled).toBe(
      true,
    );
    fireEvent.click(
      screen.getByLabelText(
        'He guardado mis códigos de recuperación en un lugar seguro',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }));

    expect(await screen.findByText('Verificación en dos pasos activada.')).toBeTruthy();
    expect(auth.updateUser).toHaveBeenCalledWith({ twoFactorOn: true });
  });

  it('muestra la contraseña incorrecta en el campo y no actualiza el usuario', async () => {
    auth.user = { twoFactorOn: true };
    twoFactorDisable.mockRejectedValue(
      new ApiError('Contraseña incorrecta', {
        status: 400,
        code: 'INVALID_PASSWORD',
      }),
    );

    render(<TwoFactorSection />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Desactivar verificación en dos pasos',
      }),
    );
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: 'equivocada1' },
    });
    fireEvent.change(
      screen.getByLabelText(/^Código de verificación o de recuperación/),
      { target: { value: '123456' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('La contraseña es incorrecta.')).toBeTruthy();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('regenera códigos de recuperación y solo los muestra en ese paso', async () => {
    auth.user = { twoFactorOn: true };
    regenerateRecoveryCodes.mockResolvedValue({
      recoveryCodes: ['nuevo-codigo-1234'],
    });

    render(<TwoFactorSection />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Generar códigos de recuperación nuevos',
      }),
    );
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: 'correcta123' },
    });
    fireEvent.change(
      screen.getByLabelText(/^Código de verificación o de recuperación/),
      { target: { value: 'abcd-efgh-jkmn' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Generar códigos' }));

    expect(await screen.findByText('nuevo-codigo-1234')).toBeTruthy();
    expect(regenerateRecoveryCodes).toHaveBeenCalledWith({
      password: 'correcta123',
      code: 'abcd-efgh-jkmn',
    });
    fireEvent.click(
      screen.getByLabelText(
        'He guardado mis códigos de recuperación en un lugar seguro',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terminar' }));

    expect(
      await screen.findByText(
        'Códigos de recuperación nuevos guardados. Los anteriores ya no funcionan.',
      ),
    ).toBeTruthy();
  });

  it('desactiva el 2FA y acepta un código de recuperación', async () => {
    auth.user = { twoFactorOn: true };
    twoFactorDisable.mockResolvedValue({ user: { twoFactorOn: false } });

    render(<TwoFactorSection />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Desactivar verificación en dos pasos',
      }),
    );
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: 'correcta123' },
    });
    fireEvent.change(
      screen.getByLabelText(/^Código de verificación o de recuperación/),
      { target: { value: 'abcd-efgh-jkmn' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('Verificación en dos pasos desactivada.')).toBeTruthy();
    expect(twoFactorDisable).toHaveBeenCalledWith({
      password: 'correcta123',
      code: 'abcd-efgh-jkmn',
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ twoFactorOn: false });
    expect(me).not.toHaveBeenCalled();
  });
});
