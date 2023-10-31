import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(() => {
        let currentValue: T;

        try {
            currentValue = JSON.parse(localStorage.getItem(key) || `"${defaultValue}"`);
        } catch (error) {
            currentValue = defaultValue;
        }

        return currentValue;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [value, key]);

    return [value, setValue];
}
