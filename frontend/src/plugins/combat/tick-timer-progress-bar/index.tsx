/** @format */

import { FunctionComponent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { gsap } from 'gsap';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './tick-timer-progress-bar.styles';

export interface TickTimerProgressBarProps extends ComponentProps {
    blockTime: number;
    blockNumber: number;
}

const StyledTickTimerProgressBar = styled('div')`
    ${styles}
`;

export const TickTimerProgressBar: FunctionComponent<TickTimerProgressBarProps> = (
    props: TickTimerProgressBarProps
) => {
    const { blockTime, blockNumber } = props;
    const [remainingTime, setRemainingTime] = useState<number>(blockTime);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setRemainingTime((value) => {
                return value > 0 ? value - 1 : 0;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setRemainingTime(blockTime);
    }, [blockNumber]);

    useLayoutEffect(() => {
        if (remainingTime === blockTime) {
            gsap.killTweensOf(progressRef.current);
            gsap.to(progressRef.current, { scaleX: 1, duration: 0 });
            gsap.to(progressRef.current, { opacity: 0, duration: 0 });
            gsap.to(progressRef.current, { opacity: 1, duration: 0.5, delay: 0 });
        } else {
            gsap.to(progressRef.current, {
                scaleX: Math.max((remainingTime - 1) / (blockTime - 1), 0),
                duration: 1,
                ease: 'none'
            });
        }
    }, [remainingTime, blockTime]);

    console.log(blockNumber);

    return (
        <StyledTickTimerProgressBar {...props}>
            <div className="progress-bar" ref={progressRef}></div>
            <span className="label">Next hit in {remainingTime}s</span>
        </StyledTickTimerProgressBar>
    );
};
