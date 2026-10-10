import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Dialog({ labelledBy, className, close, children }: {
  labelledBy: string; className: string; close: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(close);
  dismiss.current = close;
  useEffect(() => {
    const node = dialog.current!;
    const opener = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={className} aria-labelledby={labelledBy}
    onCancel={event => { event.preventDefault(); dismiss.current(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss.current();
    }}>{children}</dialog>;
}
