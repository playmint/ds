import { css } from 'styled-components';
import { MapProps } from './index';

const baseStyles = (_: Partial<MapProps>) => css`
    position: absolute;
    width: 100vw;
    height: 100vh;

    .selection-actions {
        position: fixed;
        top: 8rem;
        right: 5rem;
        width: 300px;
        color: white;
    }
    .bags li,
    .bags li:not(:last-child) {
        margin-bottom: 0.5rem;
    }
    .seeker-selector {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        overflow: visible;
        margin-bottom: 5rem;

        > .shield {
            position: absolute;
            left: 2rem;
        }

        > .controls {
            display: flex;
            flex-direction: row;

            .label {
                padding: 0 0.5rem;
                text-transform: uppercase;
            }
        }
    }
    .seeker {
        margin: 1rem 1rem;
    }
    .info-box {
        background: #143063;
        padding: 1rem;
        margin-top: 1rem;
    }
`;

export const styles = (props: Partial<MapProps>) => css`
    ${baseStyles(props)}
`;
