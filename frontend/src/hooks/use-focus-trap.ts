/** @format */
import { useEffect, useRef } from 'react';

export function useFocusTrap<T extends HTMLElement>(initialValue: T | null) {
    const ref = useRef<T>(initialValue);

    function handleFocus(event: KeyboardEvent) {
        if (!ref.current) {
            return;
        }

        const focusableElements = ref.current.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );

        if (focusableElements.length === 0) {
            return;
        }

        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        const tabKeyCode = 9;
        const isTabPressed = event.key === 'Tab' || event.keyCode === tabKeyCode;

        if (!isTabPressed) {
            return;
        }

        if (event.shiftKey) {
            // shift + tab
            if (document.activeElement === firstFocusableElement) {
                (lastFocusableElement as HTMLElement).focus();
                event.preventDefault();
            }
        } else {
            // tab
            if (document.activeElement === lastFocusableElement) {
                (firstFocusableElement as HTMLElement).focus();
                event.preventDefault();
            }
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleFocus);

        return () => {
            window.removeEventListener('keydown', handleFocus);
        };
    }, []);

    return ref;
}
