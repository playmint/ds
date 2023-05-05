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
        overflow: hidden;
    }

    code {
        font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
        monospace;
    }

    h1, h2, h3, h4 {
        text-transform: uppercase;
    }


    h3 {
        margin-bottom: 2rem;
    }

    form {
        width: 100%;
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
        user-select: none;
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
        user-select: none;
    }

    .onboarding {

        padding: 2rem 2rem;

        > button {
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
        > p {
            margin: 2rem 0;
        }
    }

    .tile-actions {

    }

    .seeker-actions {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 30rem;
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

    .action-icon-button {
        border-radius: 5px;
        border: none;
        border-bottom: 4px solid #b7c5e0;
        display: block;
        width: 60px;
        height: 60px;
        box-sizing: border-box;
        background: #fff;
        color: #143063;
        padding: 1.2rem 1rem 0.8rem;
        font-weight: 600;

        &:disabled {
            opacity: 0.5;
        }
        
        &.active {
            background: #ddeeff;
            opacity: 1;
        }
    }

    .link-button {
        display: inline;
        background: none;
        border: 0;
        padding: 0;
        border-radius: 0;
        width: auto;
        color: white;
    }
    
    .info-box {
        h3 {
            margin-bottom: 0;
        }
        .actions {
            display: flex;
            gap: 0.6rem;
            justify-content: center;
        }
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
                text-transform: uppercase;
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

    form {
        width: 100%;
        > select, button {
            box-sizing: border-box;
            display: inline-block;
            border-radius: 20px;
            width: inherit;
            padding: 10px;
            border-bottom: 4px solid #b7c5e0;
            margin: 0 0 5px 0;
            font-weight: 600;
        }
    }

`;
