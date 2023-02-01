/** @format */

import { css } from 'styled-components';

export const resetStyles = css`
    html {
        font-size: 10px;
        height: 100vh;
        width: 100%;
    }
    #__next {
        height: 100vh;
        width: 100%;
    }
    /* Box sizing rules */
    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }

    /* Remove default padding */
    ul,
    ol {
        padding: 0;
    }

    /* Remove default margin */
    body,
    h1,
    h2,
    h3,
    h4,
    p,
    ul[class],
    ol[class],
    li,
    figure,
    figcaption,
    blockquote,
    dl,
    dd {
        margin: 0;
    }

    /* Set core body defaults */
    body {
        min-height: 100vh;
        scroll-behavior: smooth;
        text-rendering: optimizeSpeed;
        line-height: 1.5;
    }

    /* Remove list styles on ul, ol elements with a class attribute */
    ul[class],
    ol[class] {
        list-style: none;
    }

    /* A elements that don't have a class get default styles */
    a:not([class]) {
        text-decoration-skip-ink: auto;
    }

    /* Make images easier to work with */
    img {
        max-width: 100%;
        display: block;
    }

    /* Natural flow and rhythm in articles by default */
    article > * + * {
        margin-top: 1em;
    }

    /* Inherit fonts for inputs and buttons */
    input,
    button,
    textarea,
    select {
        font: inherit;
    }

    /* Remove all animations and transitions for people that prefer not to see them */
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
        }
    }
    .cookiebtn,
    #rcc-decline-button {
        font-size: 2rem;
        background: rgba(0, 0, 0, 0.6);
        border-color: white;

        box-shadow: none;
        color: #b3b3b3;
        cursor: pointer;
        flex: 0 0 auto;
        padding: 5px 10px;
        margin: 15px;
    }
    .cookiecontainer {
        background: rgba(0, 0, 0, 0.6);
        align-items: baseline;
        font-family: 'Baskerville', serif;
        color: #b3b3b3;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        left: 0px;
        position: fixed;
        width: 100%;
        z-index: 999;
        bottom: 0px;
    }
    .cookiecontent {
        padding: 5px 10px;
        margin: 15px;
    }
`;
