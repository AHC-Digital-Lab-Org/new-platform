import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import {
  ALIAS_POLICY_MESSAGE,
  isAliasAllowed,
} from '../../../../../shared/alias-policy.js';
import { useAuth } from '../AuthContext.jsx';
import {
  listRegistrationCountries,
  register,
  searchRegistrationCities,
} from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';
import SearchableSelect from '../components/SearchableSelect.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const INITIAL = {
  alias: '',
  email: '',
  password: '',
  confirm: '',
  nombre: '',
  ciudad: '',
  pais: '',
  terminos: false,
  privacidad: false,
  comunicaciones: false,
};

function validate(form, countryCode, citySelected) {
  const errors = {};
  const alias = form.alias.trim();
  if (alias.length < 3 || alias.length > 30) {
    errors.alias = 'El alias debe tener entre 3 y 30 caracteres.';
  } else if (!isAliasAllowed(alias)) {
    errors.alias = ALIAS_POLICY_MESSAGE;
  }
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Introduce un email válido.';
  if (form.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (form.confirm !== form.password) errors.confirm = 'Las contraseñas no coinciden.';
  if (!form.terminos) errors.terminos = 'Debes aceptar los términos de uso.';
  if (!form.privacidad) {
    errors.privacidad = 'Debes aceptar la política de privacidad.';
  }
  if (form.pais && !countryCode) {
    errors.pais = 'Selecciona un país de la lista.';
  }
  if (form.ciudad && (!countryCode || !citySelected)) {
    errors.ciudad = 'Selecciona una ciudad de la lista del país elegido.';
  }
  return errors;
}

function Check({ label, error, ref, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2 text-sm">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-4 accent-emerald-700"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const { submit, loading, error, clearError, secondsLeft } = useSubmit(register);
  const [form, setForm] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState({});
  const [countryCode, setCountryCode] = useState('');
  const [citySelected, setCitySelected] = useState(false);
  const [countryOptions, setCountryOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [doneEmail, setDoneEmail] = useState(null);
  const refs = useRef({});
  const doneHeading = useRef(null);

  useEffect(() => {
    if (doneEmail) doneHeading.current?.focus();
  }, [doneEmail]);

  useEffect(() => {
    let active = true;
    listRegistrationCountries()
      .then(({ countries: options }) => {
        if (active) {
          setCountryOptions(options);
          setCountriesLoading(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setLocationError(authErrorMessage(requestError));
          setCountriesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!countryCode || form.ciudad.trim().length < 1) {
      setCityOptions([]);
      setCitiesLoading(false);
      return undefined;
    }

    let active = true;
    setCitiesLoading(true);
    const timeout = setTimeout(() => {
      searchRegistrationCities({
        country: countryCode,
        query: form.ciudad.trim(),
      })
        .then(({ cities: options }) => {
          if (active) {
            setCityOptions(options);
            setLocationError('');
          }
        })
        .catch((requestError) => {
          if (active) setLocationError(authErrorMessage(requestError));
        })
        .finally(() => {
          if (active) setCitiesLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [countryCode, form.ciudad]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const setField = (name) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    const errors = validate(form, countryCode, citySelected);
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      refs.current[firstError]?.focus();
      return;
    }

    const body = {
      alias: form.alias.trim(),
      email: form.email.trim(),
      password: form.password,
      consentimientos: {
        terminos: true,
        privacidad: true,
        comunicaciones: form.comunicaciones,
        fecha: new Date().toISOString(),
      },
    };
    for (const key of ['nombre', 'ciudad', 'pais']) {
      const value = form[key].trim();
      if (value) body[key] = value;
    }

    clearError();
    const result = await submit(body);
    if (result.ok) setDoneEmail(body.email);
  };

  if (doneEmail) {
    return (
      <section className="mx-auto max-w-lg rounded-lg border bg-white p-6 shadow-sm">
        <h1 ref={doneHeading} tabIndex={-1} className="text-2xl font-bold outline-none">
          Revisa tu correo
        </h1>
        <p role="status" className="mt-3 text-slate-600">
          Hemos creado tu cuenta y enviado un enlace de verificación a{' '}
          <strong>{doneEmail}</strong>. Tienes que verificar tu email antes de
          poder iniciar sesión.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          ¿No te ha llegado?{' '}
          <Link
            to="/resend-verification"
            state={{ email: doneEmail }}
            className="text-emerald-700 underline"
          >
            Reenviar el correo
          </Link>
        </p>
        <Link to="/login" className="mt-4 inline-block text-emerald-700 underline">
          Ir a iniciar sesión
        </Link>
      </section>
    );
  }

  const text = (name, label, props = {}) => (
    <FormField
      label={label}
      name={name}
      value={form[name]}
      onChange={setField(name)}
      error={fieldErrors[name]}
      ref={(element) => {
        refs.current[name] = element;
      }}
      {...props}
    />
  );

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">
        Los campos marcados con * son obligatorios.
      </p>
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-4 space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        {text('alias', 'Alias', {
          required: true,
          autoComplete: 'username',
          hint: 'Entre 3 y 30 caracteres.',
        })}
        {text('email', 'Email', {
          required: true,
          type: 'email',
          autoComplete: 'email',
        })}
        <div className="relative">
          {text('password', 'Contraseña', {
            required: true,
            type: showPassword ? 'text' : 'password',
            autoComplete: 'new-password',
            onPaste: (event) => event.preventDefault(),
            className: 'pr-20',
            hint: 'Mínimo 8 caracteres.',
          })}
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-pressed={showPassword}
            className="absolute right-2 top-8 rounded px-2 py-1 text-sm text-emerald-700 underline"
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {text('confirm', 'Repite la contraseña', {
          required: true,
          type: showPassword ? 'text' : 'password',
          autoComplete: 'new-password',
          onPaste: (event) => event.preventDefault(),
        })}
        {text('nombre', 'Nombre', { autoComplete: 'name' })}
        <SearchableSelect
          label="País"
          value={form.pais}
          options={countryOptions.map(({ name }) => name)}
          placeholder="Busca un país"
          hint={
            countriesLoading
              ? 'Cargando países…'
              : 'Escribe para buscar y selecciona un país de la lista.'
          }
          error={fieldErrors.pais}
          disabled={countriesLoading || countryOptions.length === 0}
          inputRef={(element) => {
            refs.current.pais = element;
          }}
          onChange={(value) => {
            setCountryCode('');
            setCitySelected(false);
            setForm((current) => ({ ...current, pais: value, ciudad: '' }));
            setFieldErrors((current) => {
              const { pais: _pais, ciudad: _ciudad, ...rest } = current;
              return rest;
            });
          }}
          onSelect={(name) => {
            setCountryCode(
              countryOptions.find((country) => country.name === name)?.code ??
                '',
            );
            setCitySelected(false);
            setCityOptions([]);
            setForm((current) => ({ ...current, pais: name, ciudad: '' }));
            setFieldErrors((current) => {
              const { pais: _pais, ciudad: _ciudad, ...rest } = current;
              return rest;
            });
          }}
        />
        <SearchableSelect
          label="Ciudad"
          value={form.ciudad}
          options={cityOptions}
          placeholder={countryCode ? 'Busca una ciudad' : 'Primero elige un país'}
          hint="Escribe para buscar entre las ciudades del país seleccionado."
          error={fieldErrors.ciudad}
          disabled={!countryCode}
          loading={citiesLoading}
          inputRef={(element) => {
            refs.current.ciudad = element;
          }}
          onChange={(value) => {
            setCitySelected(false);
            setCityOptions([]);
            setForm((current) => ({ ...current, ciudad: value }));
            setFieldErrors((current) => {
              const { ciudad: _ciudad, ...rest } = current;
              return rest;
            });
          }}
          onSelect={(name) => {
            setCitySelected(true);
            setForm((current) => ({ ...current, ciudad: name }));
            setFieldErrors((current) => {
              const { ciudad: _ciudad, ...rest } = current;
              return rest;
            });
          }}
        />
        {locationError && <FormError message={locationError} />}

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Consentimientos</legend>
          <Check
            label="Acepto los términos de uso *"
            checked={form.terminos}
            onChange={setField('terminos')}
            error={fieldErrors.terminos}
            ref={(element) => {
              refs.current.terminos = element;
            }}
          />
          <Check
            label="He leído y acepto la política de privacidad *"
            checked={form.privacidad}
            onChange={setField('privacidad')}
            error={fieldErrors.privacidad}
            ref={(element) => {
              refs.current.privacidad = element;
            }}
          />
          <Check
            label="Quiero recibir comunicaciones de la organización (opcional)"
            checked={form.comunicaciones}
            onChange={setField('comunicaciones')}
          />
        </fieldset>

        <FormError message={authErrorMessage(error)} />
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? 'Creando cuenta…'
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-emerald-700 underline">
          Iniciar sesión
        </Link>
      </p>
    </section>
  );
}
