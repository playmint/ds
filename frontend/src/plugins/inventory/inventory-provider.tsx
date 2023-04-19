/** @format */
import { styles } from '@app/plugins/inventory/bag-item/bag-item.styles';
import { Tile, usePlayer, useSelection, useWorld } from '@dawnseekers/core';
import { createContext, ReactNode, RefObject, useContext, useEffect, useReducer, useRef, useState } from 'react';
import styled from 'styled-components';
import { useClickOutside } from '@app/plugins/inventory/use-click-outside';
import { ethers } from 'ethers';

export interface InventoryContextProviderProps {
    children?: ReactNode;
}

export interface TransferInfo {
    id: string;
    equipIndex: number;
    slotKey: number;
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
    dropStack: (target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotKey'>, targetCurrentBalance: number) => void;
    dropSingle: (target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotKey'>, targetCurrentBalance: number) => void;
    isSeekerAtLocation: (tile: Tile) => boolean;
    getPendingFromTransfers: (ownerId: string, equipIndex: number) => [TransferInfo, TransferInfo][];
    getPendingToTransfers: (ownerId: string, equipIndex: number) => [TransferInfo, TransferInfo][];
    addBagRef: (ref: RefObject<HTMLElement>) => void;
    removeBagRef: (ref: RefObject<HTMLElement>) => void;
}

export const useInventoryContext = createContext<InventoryContextStore>({} as InventoryContextStore);

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

    type PendingTransfers = [TransferInfo, TransferInfo][];

    const [pendingTransfers, updatePendingTransfers] = useReducer(
        (state: PendingTransfers, action: (state: PendingTransfers) => PendingTransfers) => {
            return action(state);
        },
        []
    );

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

        updatePendingTransfers((pending) => {
            pending = pending.filter(([_, to]) => {
                // get the owner of 'to'
                // when the balance of the target slot equals our pending balance then the transfer is complete
                // and we need to keep the pending transfer
                const transferCompleted = owners.some((o) => {
                    const slot =
                        o.id === to.id ? o.bags[to.equipIndex].bag.slots.find((s) => s.key === to.slotKey) : undefined;
                    return (
                        slot &&
                        slot.balance === to.newBalance &&
                        slot.item.id === to.itemId &&
                        slot.item.kind === to.itemKind
                    );
                });
                return !transferCompleted;
            });
            return pending;
        });
    }, [player, selectedTiles, world?.block]);

    /**
     * check if the selected seeker is on the selected tile
     * @returns true if the seeker is on the selected tile
     */
    const isSeekerAtLocation = (tile: Tile) => {
        const seekerLocation = selectedSeeker?.nextLocation?.tile;
        if (!seekerLocation) {
            return false;
        }
        return distance(getCoords(tile.coords), getCoords(seekerLocation.coords)) <= 1;
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
        target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotKey'>,
        targetCurrentBalance: number
    ): void => {
        if (!pickedUpItemRef.current) {
            console.error('Cannot drop an item, you are not holding an item');
            return;
        }

        const transferQuantity = pickedUpItemRef.current.quantity;

        transferItem(
            pickedUpItemRef.current.transferInfo,
            {
                id: target.id,
                equipIndex: target.equipIndex,
                slotKey: target.slotKey,
                newBalance: targetCurrentBalance + transferQuantity,
                itemId: pickedUpItemRef.current.transferInfo.itemId,
                itemKind: pickedUpItemRef.current.transferInfo.itemKind
            },
            transferQuantity
        );
        clearPickedUpItem();
    };

    // we want to store a queue of transfers mapping target -> timeout id
    // we want to push pending before we trigger transfer

    const dropSingle = (
        target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotKey'>,
        targetCurrentBalance: number
    ): void => {
        if (!pickedUpItemRef.current) {
            console.error('Cannot drop an item, you are not holding an item');
            return;
        }

        const transferQuantity = 1;

        transferItem(
            pickedUpItemRef.current.transferInfo,
            {
                id: target.id,
                equipIndex: target.equipIndex,
                slotKey: target.slotKey,
                newBalance: targetCurrentBalance + transferQuantity,
                itemId: pickedUpItemRef.current.transferInfo.itemId,
                itemKind: pickedUpItemRef.current.transferInfo.itemKind
            },
            transferQuantity
        );

        pickedUpItemRef.current.quantity -= transferQuantity;
        if (pickedUpItemRef.current.quantity == 0) {
            clearPickedUpItem();
        }
    };

    const transferQueue = useRef<
        {
            target: TransferInfo;
            quantity: number;
            timeoutId: NodeJS.Timeout;
        }[]
    >([]);

    const isTransferInfoEqual = (a: TransferInfo, b: TransferInfo) => {
        return a.id === b.id && a.equipIndex === b.equipIndex && a.slotKey === b.slotKey;
    };

    const transferItem = (from: TransferInfo, to: TransferInfo, quantity: number) => {
        if (isTransferInfoEqual(from, to)) {
            return;
        }
        if (!selectedSeeker) {
            console.error('Cannot transfer item, no selected seeker');
            return;
        }
        if (!player) {
            console.error('Cannot transfer item, no connected player');
            return;
        }

        // see if we have any queued transfers to this slot
        const queuedTransferIndex = transferQueue.current.findIndex(({ target }) => isTransferInfoEqual(to, target));

        if (queuedTransferIndex > -1) {
            const queuedTransfer = transferQueue.current[queuedTransferIndex];

            // cancel the existing transfer, so we can update and resend it
            clearTimeout(queuedTransfer.timeoutId);

            // remove the queued transfer
            transferQueue.current.splice(queuedTransferIndex, 1);

            // add the cancelled transfer quantity to the new transfer
            quantity += queuedTransfer.quantity;
        }

        const id = setTimeout(() => {
            // make our dispatch
            player.dispatch({
                name: 'TRANSFER_ITEM_SEEKER',
                args: [
                    selectedSeeker.id,
                    [from.id, to.id],
                    [from.equipIndex, to.equipIndex],
                    [from.slotKey, to.slotKey],
                    quantity
                ]
            });

            // clean up our queue
            const queuedTransferIndex = transferQueue.current.findIndex(({ timeoutId }) => timeoutId === id);
            transferQueue.current.splice(queuedTransferIndex, 1);
        }, 1000);

        // add our queued transfer
        transferQueue.current.push({
            target: to,
            quantity: quantity,
            timeoutId: id
        });

        // add pending transfer, removing and combining
        updatePendingTransfers((pending) => {
            pending = pending.filter(([_, pendingTransferInfo]) => !isTransferInfoEqual(pendingTransferInfo, to));
            pending.push([from, to]);
            return pending;
        });
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
                        pointerEvents: 'none',
                        zIndex: '2147483647'
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

interface Coords {
    q: number;
    r: number;
    s: number;
}
function distance(a: Coords, b: Coords): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

function getCoords(coords: any[]): Coords {
    return {
        q: Number(ethers.fromTwos(coords[1], 16)),
        r: Number(ethers.fromTwos(coords[2], 16)),
        s: Number(ethers.fromTwos(coords[3], 16))
    };
}
