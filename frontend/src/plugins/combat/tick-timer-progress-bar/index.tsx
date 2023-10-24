import { FunctionComponent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { gsap } from 'gsap';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './tick-timer-progress-bar.styles';

export interface TickTimerProgressBarProps extends ComponentProps {
    every: number;
}

const StyledTickTimerProgressBar = styled('div')`
    ${styles}
`;

export const TickTimerProgressBar: FunctionComponent<TickTimerProgressBarProps> = ({
    every,
    className,
}: TickTimerProgressBarProps) => {
    const [remainingTime, setRemainingTime] = useState<number>(every);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setRemainingTime((value) => {
                return value > 0 ? value - 1000 : every;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [every]);

    useEffect(() => {
        setRemainingTime(every);
    }, [every]);

    useLayoutEffect(() => {
        if (remainingTime === every) {
            gsap.killTweensOf(progressRef.current);
            gsap.to(progressRef.current, { scaleX: 1, duration: 0 });
            gsap.to(progressRef.current, { opacity: 0, duration: 0 });
            gsap.to(progressRef.current, { opacity: 1, duration: 0.5, delay: 0 });
        } else {
            gsap.to(progressRef.current, {
                scaleX: Math.max((remainingTime - 1000) / (every - 1000), 0),
                duration: 1.05,
                ease: 'none',
            });
        }
    }, [remainingTime, every]);

    return (
        <StyledTickTimerProgressBar className={className}>
            <div className="progress-bar" ref={progressRef}></div>
        </StyledTickTimerProgressBar>
    );
};
