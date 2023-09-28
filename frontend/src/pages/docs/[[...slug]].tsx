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
import rehypeMermaid from 'rehype-mermaidjs';

import type { InferGetStaticPropsType, GetStaticProps, GetStaticPaths } from 'next';
import { NavPanel } from '@app/components/panels/nav-panel';
import styled from 'styled-components';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';

const DOCS_CONTENT_DIR = '../docs';

async function markdownToHtml(markdown: string) {
    console.log('doing the thing');
    const result = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeMermaid, { strategy: 'inline-svg' })
        .use(rehypeHighlight)
        .use(rehypeStringify)
        .process(markdown);
    return result.toString();
}

interface DocMeta {
    slug: string[];
    title: string;
    sidebar_position?: number;
}

interface Doc extends DocMeta {
    markdown: string;
    html: string;
}

interface DocTree {
    title: string;
    sidebar_position: number;
    slug: string[];
    children: DocTree[];
}

const Markdown = styled.div`
    padding: 5rem;
    color: white;
    h1,
    h2,
    h3,
    h4 {
        margin-top: 2rem;
        margin-bottom: 1rem;
    }
    ul,
    ol {
        margin-left: 3rem;
    }
    a {
        color: white;
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
        color: white;
    }
`;

const DocsSidebar = ({ doc }: { doc: DocTree }) => {
    return (
        <SidebarList>
            {doc.slug.length > 0 && (
                <li>
                    <Link href={`/docs/${doc.slug.join('/')}`}>{doc.title || doc.slug.slice(-1).find(() => true)}</Link>
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
    const html = processMarkdown ? await markdownToHtml(markdown) : '';

    return {
        slug,
        title,
        sidebar_position,
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
        .map(({ sidebar_position, title, slug }) => ({
            sidebar_position: sidebar_position ?? 0,
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
    const slug = params && Array.isArray(params.slug) ? params.slug : [];
    const docs = await getAllDocs();
    const tree = {
        title: 'root',
        sidebar_position: 0,
        slug: [],
        children: getChildDocs(docs, []),
    };
    const doc = await getDocBySlug(slug, true);
    return { props: { doc, tree } };
}) satisfies GetStaticProps<{
    doc: Doc;
    tree: DocTree;
}>;

export default function Page({ doc, tree }: InferGetStaticPropsType<typeof getStaticProps>) {
    const config = useConfig();
    // const router = useRouter();
    if (!doc) {
        return <ErrorPage statusCode={404} />;
    }
    return (
        <WalletProviderProvider>
            <GameStateProvider config={config}>
                <SessionProvider>
                    <div className="nav-container">
                        <NavPanel />
                    </div>
                    <div style={{ float: 'left', width: '30rem' }}>
                        <div style={{ padding: '5rem 0' }}>
                            <DocsSidebar doc={tree} />
                        </div>
                    </div>
                    <div style={{ float: 'left', width: '50%' }}>
                        <DocBody content={doc.html} />
                    </div>
                </SessionProvider>
            </GameStateProvider>
        </WalletProviderProvider>
    );
}
