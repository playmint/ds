/** @format */
import { ElementType } from 'react';

export interface ComponentProps {
    /**
     * Selection ID for test purposes.
     */
    'data-testid'?: string;

    /**
     * Custom className
     */
    className?: string;

    /**
     * Custom id
     */
    id?: string;

    /**
     * Override the styled element type
     */
    as?: ElementType;
}
