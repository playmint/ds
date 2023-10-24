import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Recursive:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <body style={{ overflow: 'hidden' }}>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
