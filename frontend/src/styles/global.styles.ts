/** @format */

import { createGlobalStyle } from 'styled-components';
import { resetStyles } from './reset.styles';
import 'bootstrap-icons/font/bootstrap-icons.css';

export const GlobalStyles = createGlobalStyle`
    ${resetStyles}

    button {
        cursor: pointer;
    }

    i {
        color: inherit;
    }

    // TODO tidy these styles up

    body {
        margin: 0;
        font-family: 'Recursive', monospace;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background: #335c90;
        font-size: 1.6rem;
        overflow: hidden;
    }

    .build-version {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        opacity: 0.5;
        font-size: 1.3rem;
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

    .action-button {
        border-radius: 30px;
        border: none;
        border-bottom: 4px solid #b7c5e0;
        display: block;
        width: 100%;
        max-width: 26rem;
        box-sizing: border-box;
        background: #fff;
        color: #143063;
        padding: 1.2rem 2rem 0.8rem;
        font-weight: 600;

        &:disabled {
            opacity: 0.5;
        }
    }

    .secondary-action-button {
        border-radius: 30px;
        border: 2px solid #8697af;
        display: block;
        width: 100%;
        max-width: 20rem;
        box-sizing: border-box;
        background: #5f789b;
        color: white;
        padding: 0.8rem 2rem 0.6rem;
        font-weight: 600;

        &:disabled {
            opacity: 0.5;
        }
    }

    .icon-button {
        background: none;
        border: 0;
        padding: 0;
        border-radius: 0;
        width: auto;
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

    .action-icon-button {
        border-radius: 5px;
        border: none;
        border-bottom: 4px solid #b7c5e0;
        display: block;
        width: 50px;
        height: 50px;
        box-sizing: border-box;
        background: #fff;
        color: #143063;
        padding: 1.2rem 0rem 0.8rem;
        font-weight: 600;

        &:disabled {
            opacity: 0.5;
        }

        &.active {
            background: #ddeeff;
            opacity: 1;
        }

        &.short {
            height: 35px;
            padding: 0rem 0rem 0rem;
        }
    }

    form {
        width: 100%;

        .select {
            position: relative;
            width: 100%;

            select {
                appearance: none;
                box-sizing: border-box;
                background-color: #143063;
                border: 1px solid white;
                border-radius: 5px;
                padding: 1rem;
                margin: 0;
                width: 100%;
                font-family: inherit;
                font-size: inherit;
                cursor: inherit;
                line-height: inherit;
                color: white;
            }

            &:after {
                position: absolute;
                top: 50%;
                right: 1.6rem;
                transform: translateY(-50%);
                z-index: 10;
                content: "";
                width: 0.8em;
                height: 0.5em;
                background-color: white;
                clip-path: polygon(100% 0%, 0 0%, 50% 100%);
            }
        }
    }

`;
