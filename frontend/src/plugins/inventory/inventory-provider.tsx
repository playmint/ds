/** @format */

// import { createContext, ReactNode, useContext } from 'react';
// import { DawnseekersClient } from '@app/contexts/dawnseekers-provider';
//
//
// export interface InventoryContextStore {}
//
// export const InventoryContext = createContext<InventoryContextStore>({} as InventoryContextStore);
//
// export const useInventoryContext = () => useContext(InventoryContext);
//
// export const InventoryProvider = ({ ds, children }: InventoryContextProviderProps) => {
//     // we want to store the currently picked up item
//     // we need to name, amount, and icon
//     // we set these values in our bag item that tracks the mouse
//     // we have a flag in state to track if we have something picked up
//     // we need an escape handler to drop the item and reset things
//     // we need to handle dropping the item on a different slot
//
//     const store: InventoryContextStore = {};
//     return <InventoryContext.Provider value={store}>{children}</InventoryContext.Provider>;
// };

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Client as DawnseekersClient, Tile, useDawnseekersState } from '@core';
import { styles } from '@app/plugins/inventory/bag-item/bag-item.styles';
import styled from 'styled-components';

export interface InventoryContextProviderProps {
    ds: DawnseekersClient;
    children?: ReactNode;
}

interface TransferInfo {
    id: string;
    equipIndex: number;
    slotIndex: number;
}

interface InventoryItem {
    name: string;
    icon: string;
    quantity: number;
    transferInfo: TransferInfo;
}

interface InventoryContextStore {
    isPickedUpItemVisible: boolean;
    pickUpItem: (item: InventoryItem) => void;
    dropItem: (target: TransferInfo) => void;
    isSeekerAtLocation: (tile: Tile) => boolean;
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

export const InventoryProvider = ({ ds, children }: InventoryContextProviderProps): JSX.Element => {
    const { data } = useDawnseekersState(ds);
    const [isPickedUpItemVisible, setIsPickedUpItemVisible] = useState<boolean>(false);
    const pickedUpItemRef = useRef<InventoryItem | null>(null);
    const pickedUpItemElementRef = useRef<HTMLDivElement>(null);

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
     * check if the selected seeker is on the selected tile
     * @returns true if the seeker is on the selected tile
     */
    const isSeekerAtLocation = (tile: Tile) => {
        const selectedSeeker = data?.ui.selection.seeker;
        return tile.seekers.some((s) => s.id === selectedSeeker?.id);
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
        const selectedSeeker = data?.ui.selection.seeker;

        if (!selectedSeeker) {
            console.error('Cannot transfer item, no selected seeker');
            return;
        }

        ds.dispatch(
            'TRANSFER_ITEM_SEEKER',
            selectedSeeker.id,
            [from.id, to.id],
            [from.equipIndex, to.equipIndex],
            [from.slotIndex, to.slotIndex],
            quantity
        ).then((result) => console.log('Transfer:', result));
    };

    const inventoryContextValue: InventoryContextStore = {
        isPickedUpItemVisible,
        pickUpItem,
        dropItem,
        isSeekerAtLocation
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
