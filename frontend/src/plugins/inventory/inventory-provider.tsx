/** @format */
import { styles } from '@app/plugins/inventory/bag-item/bag-item.styles';
import { Tile, usePlayer, useSelection, useWorld } from '@dawnseekers/core';
import { createContext, ReactNode, RefObject, useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useClickOutside } from '@app/plugins/inventory/use-click-outside';

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
    dropStack: (target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotIndex'>, targetCurrentBalance: number) => void;
    dropSingle: (target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotIndex'>, targetCurrentBalance: number) => void;
    isSeekerAtLocation: (tile: Tile) => boolean;
    getPendingFromTransfers: (ownerId: string, equipIndex: number) => [TransferInfo, TransferInfo][];
    getPendingToTransfers: (ownerId: string, equipIndex: number) => [TransferInfo, TransferInfo][];
    addBagRef: (ref: RefObject<HTMLElement>) => void;
    removeBagRef: (ref: RefObject<HTMLElement>) => void;
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
    const world = useWorld();
    const [isPickedUpItemVisible, setIsPickedUpItemVisible] = useState<boolean>(false);
    const pickedUpItemRef = useRef<InventoryItem | null>(null);
    const pickedUpItemElementRef = useRef<HTMLDivElement>(null);
    const [pendingTransfers, setPendingTransfers] = useState<[TransferInfo, TransferInfo][]>([]);
    const { addRef: addBagRef, removeRef: removeBagRef } = useClickOutside(clearPickedUpItem);

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

        setPendingTransfers(
            pendingTransfers.filter(([_, to]) => {
                // get the owner of 'to'
                // when the balance of the target slot equals our pending balance then the transfer is complete
                // and we need to keep the pending transfer
                const transferCompleted = owners.some(
                    (o) => o.id === to.id && o.bags[to.equipIndex].bag.slots[to.slotIndex]?.balance === to.newBalance
                );
                return !transferCompleted;
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player, selectedTiles, world?.block]);

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

    function clearPickedUpItem() {
        pickedUpItemRef.current = null;
        setIsPickedUpItemVisible(false);
    }

    const dropStack = (
        target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotIndex'>,
        targetCurrentBalance: number
    ): void => {
        if (!pickedUpItemRef.current) {
            console.error('Cannot drop an item, you are not holding an item');
            return;
        }

        transferItem(
            pickedUpItemRef.current.transferInfo,
            {
                id: target.id,
                equipIndex: target.equipIndex,
                slotIndex: target.slotIndex,
                newBalance: pickedUpItemRef.current.quantity + targetCurrentBalance,
                itemId: pickedUpItemRef.current.transferInfo.itemId,
                itemKind: pickedUpItemRef.current.transferInfo.itemKind
            },
            pickedUpItemRef.current.quantity
        );
        clearPickedUpItem();
    };

    const dropSingle = (
        target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotIndex'>,
        targetCurrentBalance: number
    ): void => {
        if (!pickedUpItemRef.current) {
            console.error('Cannot drop an item, you are not holding an item');
            return;
        }

        transferItem(
            pickedUpItemRef.current.transferInfo,
            {
                id: target.id,
                equipIndex: target.equipIndex,
                slotIndex: target.slotIndex,
                newBalance: targetCurrentBalance + 1,
                itemId: pickedUpItemRef.current.transferInfo.itemId,
                itemKind: pickedUpItemRef.current.transferInfo.itemKind
            },
            1
        );
        pickedUpItemRef.current.quantity -= 1;
        if (pickedUpItemRef.current.quantity == 0) {
            clearPickedUpItem();
        }
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
        setPendingTransfers([...pendingTransfers, [from, to]]);
    };

    const getPendingFromTransfers = (ownerId: string, equipIndex: number) => {
        return pendingTransfers.filter(([from, _]) => {
            return from.id === ownerId && from.equipIndex === equipIndex;
        });
    };

    const getPendingToTransfers = (ownerId: string, equipIndex: number) => {
        return pendingTransfers.filter(([_, to]) => {
            return to.id === ownerId && to.equipIndex === equipIndex;
        });
    };

    const inventoryContextValue: InventoryContextStore = {
        isPickedUpItemVisible,
        pickedUpItem: pickedUpItemRef.current,
        pickUpItem,
        dropStack,
        dropSingle,
        isSeekerAtLocation,
        getPendingFromTransfers,
        getPendingToTransfers,
        addBagRef,
        removeBagRef
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
