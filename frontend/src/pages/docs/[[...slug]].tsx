import { readdir } from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import ErrorPage from 'next/error';
import Link from 'next/link';
import { unified } from 'unified';
import rehypeHighlight from 'rehype-highlight';
import remarkParse from 'remark-parse';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';

import type { InferGetStaticPropsType, GetStaticProps, GetStaticPaths } from 'next';
import styled from 'styled-components';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';
import { useRouter } from 'next/router';
import Head from 'next/head';

const DOCS_CONTENT_DIR = '../docs';

async function markdownToHtml(markdown: string) {
    const result = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeHighlight)
        .use(rehypeStringify)
        .process(markdown);
    return result.toString();
}

interface DocMeta {
    slug: string[];
    title: string;
    sidebar_position?: number;
    sidebar_hidden?: boolean;
}

interface Doc extends DocMeta {
    markdown: string;
    html: string;
}

interface DocTree {
    title: string;
    sidebar_position: number;
    sidebar_hidden: boolean;
    slug: string[];
    children: DocTree[];
}

const Markdown = styled.div`
    max-width: 90rem;
    min-width: 50rem;
    padding: 1rem 1rem 5rem 1rem;
    margin-bottom: 5rem;
    color: #24202b;
    h1,
    h2,
    h3,
    h4 {
        text-shadow: 0px 2.237093687057495px 0px #fff;
        margin-top: 2rem;
        margin-bottom: 1rem;
    }
    ul,
    ol {
        margin-left: 3rem;
    }
    a {
        color: #24202b;
        font-weight: 800;
    }
    pre code {
        border-radius: 0.5rem;
    }
`;

export const DocBody = ({ content }: { content: string }) => {
    return (
        <Markdown>
            <div dangerouslySetInnerHTML={{ __html: content }} />
        </Markdown>
    );
};

const SidebarList = styled.ul`
    padding: 0.5rem 0;
    a {
        color: #24202b;
        font-weight: 800;
        padding: 0.5rem;
    }
    a.active {
        background: linear-gradient(0deg, #fb7001 0%, #fb7001 100%), #f7f5fa;
        border-radius: 0.5rem;
        text-decoration: none;
        color: white;
    }
`;

const DocsSidebar = ({ doc }: { doc: DocTree }) => {
    const router = useRouter();
    const currentPath = router?.asPath || '';
    const url = `/docs/${doc.slug.join('/')}`;
    return (
        <SidebarList>
            {doc.slug.length > 0 && !doc.sidebar_hidden && (
                <li>
                    <Link href={url} className={currentPath === url ? 'active' : ''}>
                        {doc.title || doc.slug.slice(-1).find(() => true)}
                    </Link>
                </li>
            )}
            {doc.children.length > 0 && (
                <li style={{ marginLeft: 20 }}>
                    {doc.children.map((doc) => (
                        <DocsSidebar key={doc.slug.join('/')} doc={doc} />
                    ))}
                </li>
            )}
        </SidebarList>
    );
};

const walk = async (dirPath) => {
    return Promise.all(
        await readdir(dirPath, { withFileTypes: true }).then((entries) =>
            entries.map((entry) => {
                const childPath = join(dirPath, entry.name);
                return entry.isDirectory() ? walk(childPath) : childPath;
            })
        )
    );
};

export async function getDocBySlug(slug: string[], processMarkdown?: boolean): Promise<Doc> {
    const filename = join(DOCS_CONTENT_DIR, ...slug) + '.md';
    const fileContents = readFileSync(filename, 'utf8');
    const { data, content: markdown } = matter(fileContents);
    const sidebar_position = data.sidebar_position || 0;
    const title = data.title ?? slug.slice(-1).find(() => true) ?? '';
    const sidebar_hidden = data.sidebar_hidden || false;
    const html = processMarkdown ? await markdownToHtml(markdown) : '';

    return {
        slug,
        title,
        sidebar_position,
        sidebar_hidden,
        markdown,
        html,
    };
}

async function getAllDocs(): Promise<Doc[]> {
    return walk(DOCS_CONTENT_DIR).then((files) =>
        Promise.all(
            files.flat().map((filename) => {
                const slug = filename.replace(`${DOCS_CONTENT_DIR}/`, '').replace(/\.md$/, '').split('/');
                return getDocBySlug(slug);
            })
        )
    );
}

function bySidebarPosition(a: DocMeta, b: DocMeta) {
    return (a.sidebar_position || 0) - (b.sidebar_position || 0);
}

function getChildDocs(docs: Doc[], prefix: string[]): DocTree[] {
    return docs
        .filter((d) => {
            const slugs = d.slug;
            const hasPrefix = prefix.every((slug, idx) => slugs[idx] === slug);
            if (!hasPrefix) {
                return false;
            }
            const slugSuffix = slugs.slice(prefix.length);
            return slugSuffix.length === 1;
        })
        .map(({ sidebar_position, sidebar_hidden, title, slug }) => ({
            sidebar_position: sidebar_position ?? 0,
            sidebar_hidden: !!sidebar_hidden,
            title,
            slug,
            children: getChildDocs(docs, slug).sort(bySidebarPosition),
        }));
}

export const getStaticPaths = (async () => {
    const docs = await getAllDocs();
    return {
        paths: docs.map(({ slug }) => ({ params: { slug } })),
        fallback: true, // false or "blocking"
    };
}) satisfies GetStaticPaths;

export const getStaticProps = (async ({ params }) => {
    const slug = params && Array.isArray(params.slug) ? params.slug : null;
    const docs = await getAllDocs();
    const tree = {
        title: 'root',
        sidebar_position: 0,
        sidebar_hidden: true,
        slug: [],
        children: getChildDocs(docs, []).sort(bySidebarPosition),
    };
    const doc = await getDocBySlug(slug || ['index'], true);
    return { props: { doc, tree } };
}) satisfies GetStaticProps<{
    doc: Doc;
    tree: DocTree;
}>;

export default function Page({ doc, tree }: InferGetStaticPropsType<typeof getStaticProps>) {
    const config = useConfig();
    if (!doc) {
        return <ErrorPage statusCode={404} />;
    }
    const title = doc.title || doc.slug.slice(-1).find(() => true) || '';
    return (
        <WalletProviderProvider wallets={config?.wallets || {}}>
            <GameStateProvider config={config}>
                <SessionProvider>
                    <Head>
                        <title>Downstream: {title}</title>
                    </Head>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <div style={{}}>
                            <div
                                style={{
                                    padding: '1rem 1rem 1rem 0',
                                    margin: '3rem 2rem',
                                    maxHeight: '100%',
                                    border: '2px solid #333',
                                    borderRadius: '1rem',
                                    background: '#fff',
                                    minWidth: '28rem',
                                }}
                            >
                                <DocsSidebar doc={tree} />
                            </div>
                        </div>
                        <div style={{ flexGrow: 1, height: '100vh', paddingRight: '1rem', overflow: 'auto' }}>
                            <DocBody content={doc.html} />
                        </div>
                    </div>
                </SessionProvider>
            </GameStateProvider>
        </WalletProviderProvider>
    );
}
