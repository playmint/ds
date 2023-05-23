/** @format */

import { ComponentProps } from '@app/types/component-props';
import { useLogs, Log } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './logs.styles';

export interface LogsProps extends ComponentProps {}

const StyledLogs = styled('div')`
    ${styles}
`;

const format = (log: Log): string => {
    return `${log.timestamp.toTimeString().split(/\s/)[0]} ${log.text}`;
};

export const Logs: FunctionComponent<LogsProps> = ({ ...otherProps }: LogsProps) => {
    const logs = useLogs(10);
    return (
        <StyledLogs {...otherProps}>
            {logs &&
                [...logs].reverse().map((log, idx) => (
                    <div className="log" key={idx.toString()} style={{ opacity: 1 - idx * 0.12 }}>
                        {format(log)}
                    </div>
                ))}
        </StyledLogs>
    );
};
