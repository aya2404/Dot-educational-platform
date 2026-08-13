import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessibility helper for modal dialogs: when `active` becomes true it moves
 * focus into the dialog, keeps Tab / Shift+Tab cycling inside it, and restores
 * focus to the previously focused element when it closes. Returns a ref to put
 * on the dialog container (which should also have tabIndex={-1}).
 */
export const useFocusTrap = (active) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) {
      return undefined;
    }

    const node = containerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusable = () =>
      Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus into the dialog (first focusable, else the container itself).
    const focusables = getFocusable();
    (focusables[0] || node).focus();

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') {
        return;
      }

      const items = getFocusable();

      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', handleKeyDown);

    return () => {
      node.removeEventListener('keydown', handleKeyDown);

      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return containerRef;
};

export default useFocusTrap;
