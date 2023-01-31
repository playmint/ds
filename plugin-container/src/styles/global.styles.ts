/** @format */

import { createGlobalStyle } from 'styled-components';
import { colors } from './colors';
import { resetStyles } from './reset.styles';

export const GlobalStyles = createGlobalStyle`
    ${resetStyles}
    
    body {
        font-family: 'Baskerville', serif;
        font-weight: 400;
        background: ${colors.black};
        color: ${colors.grey}
    }
    
    a {
        color: ${colors.grey};
        text-decoration: none;
        
        &.inline {
            text-decoration: underline;
        }
    }
    
    button {
        cursor: pointer;
    }
    
    .text-button {
        padding: 0;
        background: transparent;
        color: inherit;
        border: 0;
        text-decoration: underline;
    }
    
    h1, h2, h3 {
        font-weight: 400;
    }

    h1 {
        font-size: 6.2rem;
    }
    
    h2 {
        font-size: 4.2rem;
    }
    
    h3 {
        font-size: 3.2rem;
    }
    
    p {
        margin-bottom: 2rem;
        font-size: 1.6rem;
    }
    
    svg {
        fill: currentColor;
    }
`;
