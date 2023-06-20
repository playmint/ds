/** @format */
import Shell from '@app/components/views/shell';
import { BlockTimeProvider } from '@app/contexts/block-time-provider';
import { ModalProvider } from '@app/contexts/modal-provider';
import { usePlayer, useSelection, useWorld } from '@dawnseekers/core';

export default function ShellPage() {
    const world = useWorld();
    const player = usePlayer();
    const selection = useSelection();
    const block = world ? world.block : 0;

    return (
        <BlockTimeProvider block={block}>
            <ModalProvider>
                <Shell world={world} player={player} selection={selection} />
            </ModalProvider>
        </BlockTimeProvider>
    );
}
