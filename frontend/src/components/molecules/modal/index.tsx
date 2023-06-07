/** @format */

import { forwardRef, LegacyRef, ReactNode, useEffect } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './modal.styles';
import { useModalContext } from '@app/contexts/modal-provider';

export interface ModalProps extends ComponentProps {
    children?: ReactNode;
    closable?: boolean;
    showCloseButton?: boolean;
}

const StyledModal = styled('div')`
    ${styles}
`;

export const Modal = forwardRef<HTMLDivElement, ModalProps>((props: ModalProps, ref?: LegacyRef<HTMLDivElement>) => {
    const { children, closable = true, showCloseButton = true, ...otherProps } = props;
    const { closeModal } = useModalContext();

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (!closable) {
                return;
            }
            const escapeKeyCode = 27;
            if (event.key === 'Escape' || event.keyCode === escapeKeyCode) {
                closeModal();
            }
        };

        const handleMessage = (message: any) => {
            const { method } = message.data;

            if (method === 'closeModal') {
                closeModal();
            }
        };

        window.addEventListener('keydown', handleEscape);
        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('keydown', handleEscape);
            window.removeEventListener('message', handleMessage);
        };
    }, [closeModal, closable]);

    return (
        <StyledModal {...otherProps} ref={ref}>
            {children}
            {closable && showCloseButton && (
                <button onClick={closeModal} className="close-modal-button">
                    <i className="bi bi-x" />
                </button>
            )}
        </StyledModal>
    );
});
