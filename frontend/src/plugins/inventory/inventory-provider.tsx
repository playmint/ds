/** @format */
import { styles } from '@app/plugins/inventory/bag-item/bag-item.styles';
import { Tile, usePlayer, useSelection } from '@dawnseekers/core';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

export interface InventoryContextProviderProps {
    children?: ReactNode;
}

export interface TransferInfo {
    id: string;
    equipIndex: number;
    slotIndex: number;
    newBalance: number;
    itemId: string;
    itemKind: string;
}

interface InventoryItem {
    name: string;
    icon: string;
    quantity: number;
    transferInfo: TransferInfo;
}

interface InventoryContextStore {
    isPickedUpItemVisible: boolean;
    pickedUpItem: InventoryItem | null;
    pickUpItem: (item: InventoryItem) => void;
    dropItem: (target: TransferInfo) => void;
    isSeekerAtLocation: (tile: Tile) => boolean;
    getPendingTransfers: (ownerId: string, equipIndex: number) => [TransferInfo, TransferInfo][];
}

const useInventoryContext = createContext<InventoryContextStore>({} as InventoryContextStore);

export const useInventory = (): InventoryContextStore => {
    const inventoryContext = useContext(useInventoryContext);
    if (!inventoryContext) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return inventoryContext;
};

const StyledPickedUpItem = styled('div')`
    ${styles};
    pointer-events: none;

    > .icon,
    > .amount {
        pointer-events: none;
    }
`;

export const InventoryProvider = ({ children }: InventoryContextProviderProps): JSX.Element => {
    const player = usePlayer();
    const { seeker: selectedSeeker, tiles: selectedTiles } = useSelection();
    const [isPickedUpItemVisible, setIsPickedUpItemVisible] = useState<boolean>(false);
    const pickedUpItemRef = useRef<InventoryItem | null>(null);
    const pickedUpItemElementRef = useRef<HTMLDivElement>(null);
    const pendingTransfers = useRef<[TransferInfo, TransferInfo][]>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (pickedUpItemElementRef.current) {
                pickedUpItemElementRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    useEffect(() => {
        const owners = [...(player?.seekers ?? []), ...(selectedTiles ?? [])];

        pendingTransfers.current = pendingTransfers.current.filter(([_, to]) => {
            // get the owner of 'to'
            // if we can't find the owner in the data then we have not finished
            // the transfer, and we need to keep the pending transfer
            return !owners.some((o) => o.id === to.id);
        });
    }, [player, selectedTiles]);

    /**
     * check if the selected seeker is on the selected tile
     * @returns true if the seeker is on the selected tile
     */
    const isSeekerAtLocation = (tile: Tile) => {
        return selectedSeeker?.nextLocation?.tile.id === tile.id;
    };

    const pickUpItem = (item: InventoryItem): void => {
        pickedUpItemRef.current = item;
        setIsPickedUpItemVisible(true);
    };

    const dropItem = (target: TransferInfo): void => {
        if (!pickedUpItemRef.current) {
            console.error('Cannot drop an item, you are not holding an item');
            return;
        }

        transferItem(pickedUpItemRef.current?.transferInfo, target, pickedUpItemRef.current?.quantity);
        pickedUpItemRef.current = null;
        setIsPickedUpItemVisible(false);
    };

    const transferItem = (from: TransferInfo, to: TransferInfo, quantity: number) => {
        if (!selectedSeeker) {
            console.error('Cannot transfer item, no selected seeker');
            return;
        }
        if (!player) {
            console.error('Cannot transfer item, no connected player');
            return;
        }

        player.dispatch({
            name: 'TRANSFER_ITEM_SEEKER',
            args: [
                selectedSeeker.id,
                [from.id, to.id],
                [from.equipIndex, to.equipIndex],
                [from.slotIndex, to.slotIndex],
                quantity
            ]
        });

        // add pending transfer
        pendingTransfers.current.push([from, to]);
    };

    const getPendingTransfers = (ownerId: string, equipIndex: number) => {
        return pendingTransfers.current.filter(([from, to]) => {
            return (
                (from.id === ownerId && from.equipIndex === equipIndex) ||
                (to.id === ownerId && to.equipIndex === equipIndex)
            );
        });
    };

    const inventoryContextValue: InventoryContextStore = {
        isPickedUpItemVisible,
        pickedUpItem: pickedUpItemRef.current,
        pickUpItem,
        dropItem,
        isSeekerAtLocation,
        getPendingTransfers
    };

    return (
        <useInventoryContext.Provider value={inventoryContextValue}>
            {children}
            {isPickedUpItemVisible && pickedUpItemRef.current && (
                <div
                    ref={pickedUpItemElementRef}
                    style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none'
                    }}
                >
                    <StyledPickedUpItem isPickable={false}>
                        <img src={pickedUpItemRef.current.icon} alt={pickedUpItemRef.current.name} className="icon" />
                        <span className="amount">{pickedUpItemRef.current.quantity}</span>
                    </StyledPickedUpItem>
                </div>
            )}
        </useInventoryContext.Provider>
    );
};
