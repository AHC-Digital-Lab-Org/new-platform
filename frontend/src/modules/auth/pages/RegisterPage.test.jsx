import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  listRegistrationCountries,
  register,
  searchRegistrationCities,
} from '../api.js';
import RegisterPage from './RegisterPage.jsx';

vi.mock('../api.js', () => ({
  listRegistrationCountries: vi.fn(),
  register: vi.fn(),
  searchRegistrationCities: vi.fn(),
}));
vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/^Alias/), {
    target: { value: 'persona' },
  });
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: 'persona@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^Contraseña/), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByLabelText(/^Repite la contraseña/), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByLabelText(/Acepto los términos/));
  fireEvent.click(screen.getByLabelText(/acepto la política de privacidad/));
};

beforeEach(() => {
  listRegistrationCountries.mockResolvedValue({
    countries: [{ code: 'ES', name: 'España' }],
  });
  searchRegistrationCities.mockResolvedValue({ cities: ['Madrid'] });
  register.mockResolvedValue({ user: {} });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RegisterPage', () => {
  it('rechaza alias con una vulgaridad antes de enviar el formulario', async () => {
    renderPage();
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/^Alias/), {
      target: { value: 'Púta!!!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(
        'El alias contiene una palabra no permitida. Elige otro alias.',
      ),
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('permite mostrar y ocultar la contraseña y bloquea pegar', () => {
    renderPage();
    const password = screen.getByLabelText(/^Contraseña/);
    expect(password.type).toBe('password');
    expect(password.className).toContain('w-full');
    expect(password.className).toContain('pr-20');
    expect(screen.queryByText(/pegar está desactivado/i)).toBeNull();

    const paste = createEvent.paste(password, {
      clipboardData: { getData: () => 'password123' },
    });
    fireEvent(password, paste);
    expect(paste.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(password.type).toBe('text');
    expect(screen.getByLabelText(/^Repite la contraseña/).type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(password.type).toBe('password');
  });

  it('filtra ciudades por el país seleccionado y guarda ambos valores', async () => {
    renderPage();
    fillRequiredFields();

    const country = screen.getByRole('combobox', { name: 'País' });
    expect(screen.getByRole('combobox', { name: 'Ciudad' }).disabled).toBe(
      true,
    );
    fireEvent.focus(country);
    fireEvent.change(country, { target: { value: 'España' } });
    fireEvent.click(await screen.findByRole('option', { name: 'España' }));

    const city = screen.getByRole('combobox', { name: 'Ciudad' });
    expect(city.disabled).toBe(false);
    fireEvent.focus(city);
    fireEvent.change(city, { target: { value: 'Madrid' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Madrid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Revisa tu correo')).toBeTruthy();
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ pais: 'España', ciudad: 'Madrid' }),
    );
  });

  it('no acepta una ciudad escrita sin elegir una sugerencia', async () => {
    renderPage();
    fillRequiredFields();
    const country = screen.getByRole('combobox', { name: 'País' });
    fireEvent.focus(country);
    fireEvent.change(country, { target: { value: 'España' } });
    fireEvent.click(await screen.findByRole('option', { name: 'España' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ciudad' }), {
      target: { value: 'Madrid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(
        'Selecciona una ciudad de la lista del país elegido.',
      ),
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });
});
