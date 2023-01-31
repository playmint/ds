/** @format */

import { FunctionComponent, ReactNode, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './dialog.styles';
import { WarningIcon } from '@app/components/icons/warning-icon';

export interface DialogProps extends ComponentProps {
    title: string;
    messageText: string | ReactNode;
    primaryButtonText: string;
    secondaryButtonText?: string;
    onPrimaryAction: () => void;
    onSecondaryAction: () => void;
    onClose: () => void;
}

const StyledDialog = styled('section')`
    ${styles}
`;

export const Dialog: FunctionComponent<DialogProps> = (props: DialogProps) => {
    const {
        title,
        messageText,
        primaryButtonText,
        secondaryButtonText,
        onPrimaryAction,
        onSecondaryAction,
        onClose,
        ...otherProps
    } = props;

    const primaryActionRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        primaryActionRef.current?.focus();
    }, []);

    function handleEscape(event: KeyboardEvent) {
        const escapeKeyCode = 27;
        if (event.key === 'Escape' || event.keyCode === escapeKeyCode) {
            onClose();
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, []);

    return (
        <StyledDialog {...otherProps}>
            <div className="content">
                <div className="title-bar">
                    <WarningIcon className="warning-sign" />
                    <h1 className="title">{title}</h1>
                    <button onClick={onClose} className="close-button">
                        <img src="/icons/close-modal.svg" alt={secondaryButtonText} />
                    </button>
                </div>
                <div className="message">{messageText}</div>
                <div className="controls">
                    {secondaryButtonText && (
                        <button onClick={onSecondaryAction} className="cancel-button text-button">
                            {secondaryButtonText}
                        </button>
                    )}
                    <button onClick={onPrimaryAction} className="confirm-button" ref={primaryActionRef}>
                        {primaryButtonText}
                    </button>
                </div>
            </div>
        </StyledDialog>
    );
};
