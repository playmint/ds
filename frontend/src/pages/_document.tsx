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
            <body
                style={{
                    overflow: 'hidden',
                    background:
                        'linear-gradient(0deg, rgba(247, 245, 250, 0.5) 0%, rgba(247, 245, 250, 0.5) 100%), #e4e1eb',
                }}
            >
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
