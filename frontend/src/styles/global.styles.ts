/** @format */

import { createGlobalStyle } from 'styled-components';
import { resetStyles } from './reset.styles';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { robotoCondensedStyles } from '@app/styles/roboto-condensed.styles';

export const GlobalStyles = createGlobalStyle`
    ${resetStyles}
    ${robotoCondensedStyles}
    
    button {
        cursor: pointer;
    }

    i {
        color: inherit;
    }
    
    // TODO tidy these styles up

    body {
        margin: 0;
        //font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        //'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        //sans-serif;
        font-family: 'Roboto Condensed', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background: #335c90;
        font-size: 1.6rem;
    }

    code {
        font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
        monospace;
    }
    
    .topnav {
        display: flex;
        justify-content: flex-start;
        position: absolute;
        top: 0;
        left: 0;
        width: calc(100% - 0rem);
        height: 5rem;
        background: #030f25;
    }

    .topnav-button {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        border: 0;
        border-left: 1px solid #314a7b;
        background: #050f25;
        color: #fff;
        padding: 0 2rem 0 1rem;
        
        > img {
            margin-right: 0.3rem;
        }
        
        > .text {
            display: block;
            padding-top: 5px;
        }
    }

    .tile-actions {
        position: absolute;
        bottom: 0rem;
        right: 0rem;
        width: 30rem;
        height: calc(100% - 5rem);
        background: #143063;
        color: #fff;
        overflow: hidden;
    }

    .tile-actions,
    .seeker-actions {
        .action {
            border-bottom: 1px solid #2d4778;
            background: #143063;
            color: #fff;
            padding: 2rem 2rem;
            
            > .content {
                display: flex;
                flex-direction: column; 
                align-items: center;
            }
        }
    }

    .tile-actions {
        
    }
    
    .seeker-actions {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 30rem;
        min-height: 25rem;
        background: #143063;
        color: #fff;
    }

    .action-button {
        border-radius: 20px;
        border: none;
        border-bottom: 4px solid #b7c5e0;
        display: block;
        width: 100%;
        box-sizing: border-box;
        background: #fff;
        color: #143063;
        padding: 1.2rem 2rem 0.8rem;
        font-weight: 600;
    }

    .icon-button {
        background: none;
        border: 0;
        padding: 0;
        border-radius: 0;
        width: auto;
    }
    
    .seeker-actions .seeker-selector {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        overflow: visible;
        
        > .shield {
            position: absolute;
            left: 2rem
        }
        
        > .controls {
            display: flex;
            flex-direction: row;
            
            .label {
                padding: 0 0.5rem;
            }
        }
    }

    .mapnav {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
    }
    
    // map stuff

    svg g {
        fill: #6c90bf;
        fill-opacity: 0.8;
    }

    svg .unscouted g {
        fill: #555;
        fill-opacity: 0;
    }

    svg g:hover {
        fill: #fff;
        fill-opacity: 1;
    }

    svg g:hover text {
        fill-opacity: 1;
    }

    svg .selected-seeker {
        fill: #122443;
    }

    svg g polygon {
        stroke: #6d94c9;
        stroke-width: 0.2;
        stroke-opacity: 0.3;
        transition: fill-opacity .2s;
    }

    svg .unscouted g polygon {
        stroke: #6d94c9;
        stroke-opacity: 0.1;
        fill: #fff;
    }

    svg .myseeker g polygon {
        fill: #f00;
    }

    svg .selected g polygon {
        fill: #fff;
        fill-opacity: 0.5;
        stroke: #fff;
        stroke-opacity: 0.3;
        stroke-width: 1;
    }

    svg g text {
        font-size: 0.3em;
        fill: #FFFFFF;
        fill-opacity: 0.4;
        transition: fill-opacity .2s;
    }

    svg path {
        fill: none;
        stroke: hsl(60, 20%, 70%);
        stroke-width: 0.4em;
        stroke-opacity: 0.3;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
    
`;
