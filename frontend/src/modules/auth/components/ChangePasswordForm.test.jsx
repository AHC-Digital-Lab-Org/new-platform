import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@/shared/api/client.js';
import { changePassword } from '../api.js';
import ChangePasswordForm from './ChangePasswordForm.jsx';

vi.mock('../api.js', () => ({ changePassword: vi.fn() }));
const applySession = vi.hoisted(() => vi.fn());
vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ applySession }),
}));

const fill = (current, next, confirm = next) => {
  fireEvent.change(screen.getByLabelText(/^Contraseña actual/), {
    target: { value: current },
  });
  fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), {
    target: { value: next },
  });
  fireEvent.change(screen.getByLabelText(/^Repite la nueva contraseña/), {
    target: { value: confirm },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChangePasswordForm', () => {
  it('sustituye la sesión por el token nuevo y vacía el formulario', async () => {
    changePassword.mockResolvedValue({
      token: 'NUEVO',
      user: { alias: 'ana' },
    });
    render(<ChangePasswordForm />);
    fill('vieja1234', 'nueva12345');

    expect(await screen.findByText(/Contraseña cambiada/)).toBeTruthy();
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'vieja1234',
      newPassword: 'nueva12345',
    });
    expect(applySession).toHaveBeenCalledWith('NUEVO', { alias: 'ana' });
    expect(screen.getByLabelText(/^Contraseña actual/).value).toBe('');
  });

  it('no envía si la nueva es igual a la actual', async () => {
    render(<ChangePasswordForm />);
    fill('misma12345', 'misma12345');

    expect(
      await screen.findByText('La nueva contraseña debe ser distinta de la actual.'),
    ).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('INVALID_PASSWORD se muestra bajo el campo de contraseña actual', async () => {
    changePassword.mockRejectedValue(
      new ApiError('x', { status: 400, code: 'INVALID_PASSWORD' }),
    );
    render(<ChangePasswordForm />);
    fill('equivocada1', 'nueva12345');

    expect(
      await screen.findByText('La contraseña actual es incorrecta.'),
    ).toBeTruthy();
    expect(applySession).not.toHaveBeenCalled();
  });
});
