import { useEffect } from 'react';
import { clsx } from 'clsx';

type ToastProps = {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
};

const Toast = ({ message, visible, onDismiss, duration = 2000 }: ToastProps) => {
  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeout);
  }, [visible, onDismiss, duration]);

  return (
    <div
      aria-live="polite"
      className={clsx(
        'pointer-events-none fixed inset-x-0 top-4 flex justify-center transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="pointer-events-auto rounded-full bg-slate-800/90 px-4 py-2 text-sm text-white shadow-lg">
        {message}
      </div>
    </div>
  );
};

export default Toast;
