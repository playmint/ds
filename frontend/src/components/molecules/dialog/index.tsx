/** @format */

import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, ReactNode, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './dialog.styles';

export interface DialogProps extends ComponentProps {
    children?: ReactNode;
    width?: string;
    icon?: string;
    onClose: () => void;
}

const StyledDialog = styled('dialog')`
    ${styles}
`;

export const Dialog: FunctionComponent<DialogProps> = ({ icon, width = '40rem', onClose, children, ...otherProps }) => {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (!ref.current?.open) {
            ref.current?.showModal();
        }
    }, []);

    return (
        <StyledDialog {...otherProps} ref={ref} onCancel={onClose}>
            {icon && (
                <div className="icon">
                    <div className="diamond-bg"></div>
                    <div className="diamond-br-shift">
                        <div className="diamond-br"></div>
                    </div>
                    <img src={icon} alt="icon" />
                </div>
            )}
            <div className="content">
                {children}
                <button className="close" onClick={onClose}>
                    x
                </button>
            </div>
        </StyledDialog>
    );
};
