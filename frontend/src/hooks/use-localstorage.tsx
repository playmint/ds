import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(defaultValue);

    useEffect(() => {
        if (!value || value === defaultValue) {
            return;
        }
        localStorage.setItem(key, JSON.stringify(value));
    }, [value, key, defaultValue]);

    useEffect(() => {
        let currentValue: T;

        try {
            currentValue = JSON.parse(localStorage.getItem(key) || `"${defaultValue}"`);
        } catch (error) {
            currentValue = defaultValue;
        }
        setValue(currentValue);
    }, [defaultValue, key]);

    return [value, setValue];
}
