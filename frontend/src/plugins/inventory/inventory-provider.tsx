import { CogAction, Tile, sleep } from '@app/../../core/src';
import { nullBagId } from '@app/fixtures/null-bag-id';
import { getTileDistance } from '@app/helpers/tile';
import { usePlayer, useSelection } from '@app/hooks/use-game-state';
import { styles } from '@app/plugins/inventory/bag-item/bag-item.styles';
import { useClickOutside } from '@app/plugins/inventory/use-click-outside';
import { ReactNode, RefObject, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { getFullSlotID } from './helpers';

export interface InventoryContextProviderProps {
    children?: ReactNode;
}

export interface TransferSlot {
    id: string;
    equipIndex: number;
    slotKey: number;
}

export interface TransferInfo extends TransferSlot {
    newBalance: number;
    itemId: string;
}

export interface InventoryItem {
    name: string;
    icon: string;
    quantity: number;
    transferInfo: TransferInfo;
}

interface InventoryContextStore {
    isBusySlot: (slot: TransferSlot) => boolean;
    isPickedUpItemVisible: boolean;
    pickedUpItem: InventoryItem | null;
    pickUpItem: (item: InventoryItem) => void;
    clearPickedUpItem: () => void;
    drop: (
        target: Pick<TransferInfo, 'id' | 'equipIndex' | 'slotKey'>,
        targetCurrentBalance: number,
        transferQuantity: number,
        bagId?: string
    ) => void;
    isMobileUnitAtLocation: (tile: Tile) => boolean;
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
    const { mobileUnit: selectedMobileUnit } = useSelection();
    const [isPickedUpItemVisible, setIsPickedUpItemVisible] = useState<boolean>(false);
    const [busySlots, setBusySlots] = useState<Map<string, boolean>>();
    const pickedUpItemRef = useRef<InventoryItem | null>(null);
    const pickedUpItemElementRef = useRef<HTMLDivElement>(null);
    const clearPickedUpItem = useCallback(() => {
        pickedUpItemRef.current = null;
        setIsPickedUpItemVisible(false);
    }, [setIsPickedUpItemVisible]);
    const { addRef: addBagRef, removeRef: removeBagRef } = useClickOutside(clearPickedUpItem);

    const isBusySlot = useCallback(
        (slot: TransferSlot): boolean => {
            if (!busySlots) {
                return false;
            }
            const slotID = getFullSlotID(slot);
            return busySlots.get(slotID) || false;
        },
        [busySlots]
    );

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

    /**
     * check if the selected mobileUnit is on or adjacent to the selected tile
     * @returns true if the mobileUnit is on or adjacent to the selected tile
     */
    const isMobileUnitAtLocation = (tile: Tile) => {
        const mobileUnitTile = selectedMobileUnit?.nextLocation?.tile;
        if (!mobileUnitTile) {
            return false;
        }
        const distance = getTileDistance(tile, mobileUnitTile);
        return distance < 2;
    };

    const pickUpItem = (item: InventoryItem): void => {
        pickedUpItemRef.current = item;
        setIsPickedUpItemVisible(true);
    };

    const drop = (
        target: TransferSlot,
        targetCurrentBalance: number,
        transferQuantity: number,
        bagId?: string
    ): void => {
        if (!pickedUpItemRef.current) {
            console.error('Cannot drop an item, you are not holding an item');
            return;
        }

        // don't attempt to drop more than we are holding
        transferQuantity = Math.min(transferQuantity, pickedUpItemRef.current.quantity);

        // don't attempt to drop more than a slot can hold
        transferQuantity =
            targetCurrentBalance + transferQuantity >= 100 ? 100 - targetCurrentBalance : transferQuantity;

        const source = pickedUpItemRef.current.transferInfo;
        if (source.id == target.id && source.equipIndex == target.equipIndex && source.slotKey == target.slotKey) {
            clearPickedUpItem();
            return;
        }

        if (transferQuantity == 0) {
            return;
        }

        transferItem(
            source,
            {
                id: target.id,
                equipIndex: target.equipIndex,
                slotKey: target.slotKey,
                newBalance: targetCurrentBalance + transferQuantity,
                itemId: pickedUpItemRef.current.transferInfo.itemId,
            },
            transferQuantity,
            bagId
        );

        pickedUpItemRef.current.quantity -= transferQuantity;
        clearPickedUpItem();
    };

    const isTransferInfoEqual = (a: TransferInfo, b: TransferInfo) => {
        return a.id === b.id && a.equipIndex === b.equipIndex && a.slotKey === b.slotKey;
    };

    const transferItem = (from: TransferInfo, to: TransferInfo, quantity: number, bagId?: string) => {
        if (isTransferInfoEqual(from, to)) {
            return;
        }
        if (!selectedMobileUnit) {
            console.error('Cannot transfer item, no selected mobileUnit');
            return;
        }
        if (!player) {
            console.error('Cannot transfer item, no connected player');
            return;
        }

        const fromSlotID = getFullSlotID(from);
        const toSlotID = getFullSlotID(to);

        const action = ((): CogAction | undefined => {
            if (from.id.startsWith('WALLET') && to.id.startsWith('WALLET')) {
                console.warn('cannot move items within wallet');
                return;
            } else if (from.id.startsWith('WALLET')) {
                return {
                    name: 'IMPORT_ITEM',
                    args: [from.itemId, to.id, to.equipIndex, to.slotKey, quantity],
                };
            } else if (to.id.startsWith('WALLET')) {
                return {
                    name: 'EXPORT_ITEM',
                    args: [from.id, from.equipIndex, from.slotKey, to.id.replace(/WALLET/, ''), quantity],
                };
            } else {
                return {
                    name: 'TRANSFER_ITEM_MOBILE_UNIT',
                    args: [
                        selectedMobileUnit.id,
                        [from.id, to.id],
                        [from.equipIndex, to.equipIndex],
                        [from.slotKey, to.slotKey],
                        bagId || nullBagId,
                        quantity,
                    ],
                };
            }
        })();

        if (!action) {
            return;
        }

        // mark as busy
        setBusySlots((busy) => {
            if (!busy) {
                busy = new Map<string, boolean>();
            } else {
                busy = new Map(busy);
            }
            busy.set(fromSlotID, true);
            busy.set(toSlotID, true);
            return busy;
        });

        // make our dispatch
        player
            .dispatch(action)
            .then(() => sleep(500))
            .catch((err) => console.error('transfer item failed', err))
            .finally(() => {
                setBusySlots((busy) => {
                    busy = new Map(busy);
                    busy.delete(fromSlotID);
                    busy.delete(toSlotID);
                    return busy;
                });
            });
    };

    const inventoryContextValue: InventoryContextStore = {
        isBusySlot,
        isPickedUpItemVisible,
        pickedUpItem: pickedUpItemRef.current,
        pickUpItem,
        clearPickedUpItem,
        drop,
        isMobileUnitAtLocation,
        addBagRef,
        removeBagRef,
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
                        zIndex: '999999',
                    }}
                >
                    <StyledPickedUpItem isPickable={false}>
                        <div
                            className="icon"
                            style={{
                                maskImage: `url(${pickedUpItemRef.current.icon})`,
                                WebkitMaskImage: `url(${pickedUpItemRef.current.icon})`,
                                backgroundColor: 'white',
                            }}
                        ></div>
                        <span className="amount">{pickedUpItemRef.current.quantity}</span>
                    </StyledPickedUpItem>
                </div>
            )}
        </useInventoryContext.Provider>
    );
};
