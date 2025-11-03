import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';
import App from './App';

declare global {
  interface Navigator {
    clipboard: { writeText: (value: string) => Promise<void> };
  }
}

Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true
});

describe('App component', () => {
  let container: HTMLDivElement;
  let root: Root;
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    });
    act(() => {
      root = createRoot(container);
      root.render(<App />);
    });
  });

  afterEach(() => {
    writeTextMock.mockClear();
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  const changeInputValue = (value: string) => {
    const input = container.querySelector('input#number-input') as HTMLInputElement;
    act(() => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const clickButton = (name: string) => {
    const button = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.trim().toLowerCase() === name.toLowerCase()
    );
    if (!button) throw new Error(`Button with text ${name} not found`);
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  it('converts input value into words', () => {
    changeInputValue('1200');
    clickButton('Convert');

    const result = container.querySelector('[aria-live="polite"]');
    expect(result?.textContent).toContain('One thousand two hundred');
  });

  it('validates invalid input', () => {
    changeInputValue('12 00');
    clickButton('Convert');

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toMatch(/integers only/i);
  });

  it('copies the result to clipboard', async () => {
    changeInputValue('21');
    clickButton('Convert');
    clickButton('Copy result');

    expect(writeTextMock).toHaveBeenCalledWith('Twenty one');
  });
});
