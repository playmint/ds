/** @format */
import dynamic from 'next/dynamic';

// TODO server rendered content
const DynamicShell = dynamic(() => import('@app/components/views/shell'), {
    loading: () => <p />,
    ssr: false
});

export default function ShellPage() {
    return <DynamicShell />;
}
