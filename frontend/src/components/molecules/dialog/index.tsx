/** @format */

import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, ReactNode, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './dialog.styles';

export interface DialogProps extends ComponentProps {
    children?: ReactNode;
    width: string;
    height: string;
    icon?: string;
    onClose: () => void;
}

const StyledDialog = styled('dialog')`
    ${styles}
`;

export const Dialog: FunctionComponent<DialogProps> = ({ icon, width, onClose, children, ...otherProps }) => {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (!ref.current?.open) {
            ref.current?.showModal();
        }
    }, []);

    return (
        <StyledDialog {...otherProps} ref={ref} onCancel={onClose} width={width}>
            {icon && (
                <div className="icon">
                    <img src={icon} alt="icon" />
                </div>
            )}
            <div className="content">
                {children}
                <button onClick={onClose} className="close-modal-button">
                    <i className="bi bi-x" />
                </button>
            </div>
        </StyledDialog>
    );
};
