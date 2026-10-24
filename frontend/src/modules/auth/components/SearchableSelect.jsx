import { useId, useMemo, useState } from 'react';

const MAX_RESULTS = 25;

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

export default function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  hint,
  error,
  disabled = false,
  loading = false,
  inputRef,
  onChange,
  onSelect,
}) {
  const id = useId();
  const listId = `${id}-options`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  const results = useMemo(() => {
    const query = normalize(value.trim());
    if (!open || !focused || query.length < 1) return [];

    const matches = [];
    for (const option of options) {
      if (normalize(option).includes(query)) matches.push(option);
      if (matches.length === MAX_RESULTS) break;
    }
    return matches;
  }, [focused, open, options, value]);

  const choose = (option) => {
    onSelect(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-2 focus:outline-emerald-600 disabled:bg-slate-100 ${error ? 'border-red-600' : 'border-slate-300'}`}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Opciones de ${label.toLocaleLowerCase()}`}
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-300 bg-white py-1 shadow-lg"
        >
          {results.map((option, index) => (
            <li
              id={`${listId}-${index}`}
              key={option}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-emerald-50 ${activeIndex === index ? 'bg-emerald-50' : ''}`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
      {open && focused && value.trim() && loading && (
        <p className="mt-1 text-sm text-slate-500" role="status">
          Buscando…
        </p>
      )}
      {open && focused && value.trim() && !loading && results.length === 0 && (
        <p className="mt-1 text-sm text-slate-500" role="status">
          No encontramos coincidencias.
        </p>
      )}
    </div>
  );
}
