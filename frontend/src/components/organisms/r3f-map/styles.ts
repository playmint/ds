import { css } from 'styled-components';
import { MapProps } from './index';

const baseStyles = (_: Partial<MapProps>) => css`
    position: absolute;
    width: 100vw;
    height: 100vh;
`;

export const styles = (props: Partial<MapProps>) => css`
    ${baseStyles(props)}
`;
