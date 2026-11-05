import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RecoveryCodes from './RecoveryCodes.jsx';

afterEach(() => cleanup());

describe('RecoveryCodes', () => {
  it('requiere confirmar que se guardaron antes de terminar', () => {
    const onDone = vi.fn();
    render(
      <RecoveryCodes
        codes={['abcd-efgh-jkmn', 'pqrs-tuvw-xyza']}
        title="Guarda tus códigos"
        onDone={onDone}
      />,
    );

    const finish = screen.getByRole('button', { name: 'Terminar' });
    expect(finish.disabled).toBe(true);
    expect(screen.getByRole('list').textContent).toContain('abcd-efgh-jkmn');

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    fireEvent.click(
      screen.getByLabelText(
        'He guardado mis códigos de recuperación en un lugar seguro',
      ),
    );
    expect(finish.disabled).toBe(false);
    fireEvent.click(finish);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
