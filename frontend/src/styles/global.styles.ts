/** @format */

import { createGlobalStyle } from 'styled-components';
import { resetStyles } from './reset.styles';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { colorMap } from './colors';

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
        background: ${colorMap.documentBackground};
        font-size: 1.478rem;
        user-select: none;
    }

    .build-version {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        opacity: 0.5;
        font-size: 1.3rem;
    }

    .no-scrollbars {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .no-scrollbars::-webkit-scrollbar {
        display: none;
    }

    code {
        font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
        monospace;
    }

    h1, h2, h3, h4 {
        /* text-transform: uppercase; */
        font-weight: 800;
    }

    h2 {
        font-size: 2.4rem;
    }

    h3 {
        margin-bottom: 2rem;
    }

    form {
        width: 100%;
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

    form {
        width: 100%;

        .select {
            position: relative;
            width: 100%;

            select {
                appearance: none;
                box-sizing: border-box;
                background-color: #eee;
                border: 1px solid #ccc;
                border-radius: 0.5rem;
                padding: 1rem;
                margin: 0;
                width: 100%;
                font-family: inherit;
                font-size: inherit;
                cursor: inherit;
                line-height: inherit;
                color: #333;
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
                background-color: #333;
                clip-path: polygon(100% 0%, 0 0%, 50% 100%);
            }
        }
    }

/* find another theme: https://unpkg.com/browse/highlightjs@9.16.2/styles/ */
/* http://jmblog.github.com/color-themes-for-google-code-highlightjs */

/* Tomorrow Comment */
.hljs-comment,
.hljs-quote {
  color: #8e908c;
}

/* Tomorrow Red */
.hljs-variable,
.hljs-template-variable,
.hljs-tag,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class,
.hljs-regexp,
.hljs-deletion {
  color: #c82829;
}

/* Tomorrow Orange */
.hljs-number,
.hljs-built_in,
.hljs-builtin-name,
.hljs-literal,
.hljs-type,
.hljs-params,
.hljs-meta,
.hljs-link {
  color: #f5871f;
}

/* Tomorrow Yellow */
.hljs-attribute {
  color: #eab700;
}

/* Tomorrow Green */
.hljs-string,
.hljs-symbol,
.hljs-bullet,
.hljs-addition {
  color: #718c00;
}

/* Tomorrow Blue */
.hljs-title,
.hljs-section {
  color: #4271ae;
}

/* Tomorrow Purple */
.hljs-keyword,
.hljs-selector-tag {
  color: #8959a8;
}

.hljs {
  display: block;
  overflow-x: auto;
  background: white;
  color: #4d4d4c;
  padding: 0.5em;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}
`;
