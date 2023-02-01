/** @format */

import { forwardRef, LegacyRef, ReactNode, useEffect } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './modal.styles';
import { useModalContext } from '@app/contexts/modal-provider';

export interface ModalProps extends ComponentProps {
    children?: ReactNode;
    closable?: boolean;
}

const StyledModal = styled('div')`
    ${styles}
`;

export const Modal = forwardRef<HTMLDivElement, ModalProps>((props: ModalProps, ref?: LegacyRef<HTMLDivElement>) => {
    const { children, closable = true, ...otherProps } = props;
    const { closeModal } = useModalContext();

    function handleEscape(event: KeyboardEvent) {
        if (!closable) {
            return;
        }
        const escapeKeyCode = 27;
        if (event.key === 'Escape' || event.keyCode === escapeKeyCode) {
            closeModal();
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, []);

    return (
        <StyledModal {...otherProps} ref={ref}>
            {children}
            {closable && (
                <button onClick={closeModal} className="close-modal-button">
                    <img src="/icons/close-modal.svg" alt="Close modal" />
                </button>
            )}
        </StyledModal>
    );
});
