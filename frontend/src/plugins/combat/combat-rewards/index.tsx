/** @format */

import { Bag } from '@app/plugins/inventory/bag';
import { ComponentProps } from '@app/types/component-props';
import { SelectedMobileUnitFragment, SelectedTileFragment } from '@downstream/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './combat-rewards.styles';

export interface CombatRewardsProps extends ComponentProps {
    selectedTiles: SelectedTileFragment[];
    selectedMobileUnit?: SelectedMobileUnitFragment;
}

const StyledCombatRewards = styled.div`
    ${styles}
`;

export const CombatRewards: FunctionComponent<CombatRewardsProps> = (props: CombatRewardsProps) => {
    const { selectedTiles, selectedMobileUnit } = props;

    const latestSession =
        selectedTiles.length > 0 && selectedTiles[0].sessions.length > 0
            ? selectedTiles[0].sessions.sort((a, b) => {
                  return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
              })[0]
            : undefined;

    const rewardBags =
        latestSession && selectedMobileUnit
            ? latestSession.bags.filter((equipSlot) => {
                  // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                  // bagIDs are 64bits
                  const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                  const bagMobileUnitID = (BigInt(equipSlot.bag.id) >> BigInt(16)) & mobileUnitIdMask;
                  const truncatedMobileUnitID = BigInt(selectedMobileUnit.id) & mobileUnitIdMask;
                  return bagMobileUnitID === truncatedMobileUnitID;
              })
            : [];

    if (rewardBags.length === 0) {
        return null;
    }

    if (!rewardBags.some((e) => e.bag.slots.some((s) => s.balance > 0))) {
        return null;
    }

    return (
        <StyledCombatRewards>
            <h3>Combat rewards</h3>
            <ul className="bags">
                {latestSession &&
                    rewardBags.length > 0 &&
                    rewardBags.map((equipSlot) => (
                        <Bag
                            key={equipSlot.key}
                            bag={equipSlot.bag}
                            equipIndex={equipSlot.key}
                            ownerId={latestSession.id}
                            isInteractable={true}
                        />
                    ))}
            </ul>
        </StyledCombatRewards>
    );
};
