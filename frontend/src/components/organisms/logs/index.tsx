/** @format */

import { ComponentProps } from '@app/types/component-props';
import { useLogs } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './logs.styles';

export interface LogsProps extends ComponentProps {}

const StyledLogs = styled('div')`
    ${styles}
`;

export const Logs: FunctionComponent<LogsProps> = ({ ...otherProps }: LogsProps) => {
    const logs = useLogs(3);
    return (
        <StyledLogs {...otherProps}>
            <div className="logs">
                {logs &&
                    [...logs].reverse().map((log, idx) => (
                        <code className="log" key={idx.toString()}>
                            [!] {log.text}
                        </code>
                    ))}
            </div>
        </StyledLogs>
    );
};
