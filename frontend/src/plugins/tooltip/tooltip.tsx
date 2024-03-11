import React, { useState, ReactNode, useEffect, useRef } from 'react';
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
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipDirection, setTooltipDirection] = useState<'top' | 'right' | 'bottom' | 'left'>(direction);

    const showTip = () => {
        timeout = setTimeout(() => {
            setActive(true);
        }, delay);
    };

    const hideTip = () => {
        clearTimeout(timeout);
        setActive(false);
    };

    useEffect(() => {
        if (!active) {
            return;
        }

        if (!tooltipRef.current) {
            return;
        }

        const rect = tooltipRef.current.getBoundingClientRect();
        // console.log('rect:', rect);

        if (rect.y < 0 && tooltipDirection === 'top') {
            setTooltipDirection('bottom');
        }
    }, [active, tooltipDirection]);

    return (
        <TooltipWrapper onMouseEnter={showTip} onMouseLeave={hideTip}>
            <span>
                {children}
                {active && (
                    <TooltipTip ref={tooltipRef} direction={tooltipDirection}>
                        {content}
                    </TooltipTip>
                )}
            </span>
        </TooltipWrapper>
    );
};

export default Tooltip;
