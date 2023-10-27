import React, { useState, ReactNode } from 'react';
import { TooltipWrapper, TooltipTip } from './tooltip.styles';

interface TooltipProps {
    children?: ReactNode;
    delay?: number;
    direction?: 'top' | 'right' | 'bottom' | 'left';
    content?: ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ children, delay = 400, direction = 'top', content }) => {
    let timeout: NodeJS.Timeout;

    const [active, setActive] = useState<boolean>(false);

    const showTip = () => {
        timeout = setTimeout(() => {
            setActive(true);
        }, delay);
    };

    const hideTip = () => {
        clearTimeout(timeout);
        setActive(false);
    };

    return (
        <TooltipWrapper onMouseEnter={showTip} onMouseLeave={hideTip}>
            <span>
                {children}
                {active && <TooltipTip direction={direction}>{content}</TooltipTip>}
            </span>
        </TooltipWrapper>
    );
};

export default Tooltip;
