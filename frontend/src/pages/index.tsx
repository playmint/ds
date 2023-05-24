/** @format */
import Shell from '@app/components/views/shell';
import { BlockTimeProvider } from '@app/contexts/block-time-provider';
import { ModalProvider } from '@app/contexts/modal-provider';
import { useWorld } from '@dawnseekers/core';

export default function ShellPage() {
    const world = useWorld();
    const block = world ? world.block : 0;

    return (
        <BlockTimeProvider block={block}>
            <ModalProvider>
                <Shell />
            </ModalProvider>
        </BlockTimeProvider>
    );
}
