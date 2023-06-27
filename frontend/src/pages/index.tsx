/** @format */
import Shell from '@app/components/views/shell';
import { BlockTimeProvider } from '@app/contexts/block-time-provider';
import { ModalProvider } from '@app/contexts/modal-provider';
import { useGameState } from '@dawnseekers/core';

export default function ShellPage() {
    const { world, player, selected, selectSeeker, selectTiles, selectIntent } = useGameState();
    const block = world ? world.block : 0;

    return (
        <BlockTimeProvider block={block}>
            <ModalProvider>
                <Shell
                    world={world}
                    player={player}
                    selection={selected}
                    selectSeeker={selectSeeker}
                    selectTiles={selectTiles}
                    selectIntent={selectIntent}
                />
            </ModalProvider>
        </BlockTimeProvider>
    );
}
