import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toggle from './components/Toggle';
import Toast from './components/Toast';
import {
  MAX_VALUE,
  NumberingSystem,
  detectSystemFromLocale,
  isValidDigitsOnly,
  loadPersistedSystem,
  persistSystem,
  sanitizeNumericInput,
  sentenceCase
} from './lib/helpers';
import { convertNumberToText } from './lib/converter';

const App = () => {
  const [inputValue, setInputValue] = useState('');
  const [system, setSystem] = useState<NumberingSystem>('international');
  const [detectedSystem, setDetectedSystem] = useState<NumberingSystem>('international');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const lastParsedValue = useRef<number | null>(null);

  useEffect(() => {
    const persisted = loadPersistedSystem();
    if (persisted) {
      setSystem(persisted);
      setDetectedSystem(persisted);
      return;
    }
    const locale = typeof navigator !== 'undefined' ? navigator.language : undefined;
    const detected = detectSystemFromLocale(locale);
    setSystem(detected);
    setDetectedSystem(detected);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const handleSystemChange = useCallback(
    (value: NumberingSystem) => {
      setSystem(value);
      persistSystem(value);
      if (lastParsedValue.current !== null) {
        const newResult = convertNumberToText(lastParsedValue.current, value);
        setResult(newResult);
      }
    },
    []
  );

  const parseInputValue = useCallback(
    (value: string): number | null => {
      const sanitized = sanitizeNumericInput(value);
      if (sanitized === '') {
        setError('');
        return null;
      }
      if (!isValidDigitsOnly(sanitized)) {
        setError('Integers only. Try removing spaces, symbols, or decimals.');
        return null;
      }
      const parsed = Number.parseInt(sanitized, 10);
      if (Number.isNaN(parsed)) {
        setError('Integers only. Try removing spaces, symbols, or decimals.');
        return null;
      }
      if (parsed > MAX_VALUE) {
        setError('Supported range is 0 to 9,999,999,999.');
        return null;
      }
      setError('');
      return parsed;
    },
    []
  );

  const handleConvert = useCallback(() => {
    const parsed = parseInputValue(inputValue);
    if (parsed === null) {
      setResult('');
      lastParsedValue.current = null;
      return;
    }

    const words = convertNumberToText(parsed, system);
    lastParsedValue.current = parsed;
    setResult(words);
  }, [inputValue, parseInputValue, system]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleConvert();
    },
    [handleConvert]
  );

  const handleCopy = async () => {
    if (!result) return;
    try {
      if (!('clipboard' in navigator) || typeof navigator.clipboard?.writeText !== 'function') {
        showToast('Clipboard is unavailable in this browser.');
        return;
      }
      await navigator.clipboard.writeText(result);
      showToast('Copied to clipboard.');
    } catch (error) {
      showToast('Unable to copy. Try again.');
    }
  };

  const detectedLabel = useMemo(() => sentenceCase(detectedSystem), [detectedSystem]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Utility</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Number to Text Converter</h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Convert integers up to 9,999,999,999 into clear English words in either International or Indian formats.
          </p>
        </header>

        <main className="flex flex-1 flex-col gap-10">
          <section className="rounded-3xl bg-slate-900/60 p-6 shadow-2xl ring-1 ring-slate-800/60 backdrop-blur">
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <label htmlFor="number-input" className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                Enter a number
                <input
                  id="number-input"
                  name="number"
                  inputMode="numeric"
                  pattern="[0-9,]*"
                  placeholder="e.g., 1200"
                  aria-invalid={Boolean(error)}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white shadow focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/40"
                />
              </label>
              {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Toggle value={system} onChange={handleSystemChange} />
                <p className="text-xs text-slate-400">
                  Auto-detected: <span className="font-semibold text-slate-200">{detectedLabel}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 sm:w-auto"
                >
                  Convert
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!result}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-base font-semibold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500 sm:w-auto"
                >
                  Copy result
                </button>
              </div>
            </form>
          </section>

          <section className="relative rounded-3xl bg-slate-900/40 p-6 ring-1 ring-slate-800/60 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200">Result</h2>
            <p className="mt-2 text-sm text-slate-400">Output is announced for assistive technologies and updates instantly after conversion.</p>
            <div
              aria-live="polite"
              className="mt-6 min-h-[5rem] rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-6 text-lg text-white"
            >
              {result || <span className="text-slate-500">Your conversion will appear here.</span>}
            </div>
          </section>
        </main>
      </div>
      <Toast message={toastMessage} visible={toastVisible} onDismiss={hideToast} />
    </div>
  );
};

export default App;
