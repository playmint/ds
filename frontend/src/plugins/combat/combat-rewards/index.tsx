/** @format */

import { Bag } from '@app/plugins/inventory/bag';
import { ComponentProps } from '@app/types/component-props';
import { WorldMobileUnitFragment, BagFragment, WorldCombatSessionFragment, WorldTileFragment } from '@downstream/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './combat-rewards.styles';
import { getSessionsAtTile } from '@downstream/core/src/utils';

export interface CombatRewardsProps extends ComponentProps {
    selectedTiles: WorldTileFragment[];
    sessions: WorldCombatSessionFragment[];
    bags: BagFragment[];
    selectedMobileUnit?: WorldMobileUnitFragment;
}

const StyledCombatRewards = styled.div`
    ${styles}
`;

export const CombatRewards: FunctionComponent<CombatRewardsProps> = (props: CombatRewardsProps) => {
    const { selectedTiles, selectedMobileUnit, sessions } = props;

    const selectedTileSessions =
        selectedTiles && selectedTiles.length > 0 ? getSessionsAtTile(sessions, selectedTiles[0]) : [];
    const latestSession =
        selectedTiles.length > 0 && selectedTileSessions.length > 0
            ? selectedTileSessions.sort((a, b) => {
                  return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
              })[0]
            : undefined;

    const rewardBags =
        latestSession && selectedMobileUnit
            ? latestSession.bags.filter((bag) => {
                  // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                  // bagIDs are 64bits
                  const bagMobileUnitID = BigInt.asUintN(32, BigInt(bag.id) >> BigInt(16));
                  const truncatedMobileUnitID = BigInt.asUintN(32, BigInt(selectedMobileUnit.id));
                  return bagMobileUnitID === truncatedMobileUnitID;
              })
            : [];

    if (rewardBags.length === 0) {
        return null;
    }

    if (!rewardBags.some((bag) => bag.slots.some((s) => s.balance > 0))) {
        return null;
    }

    return (
        <StyledCombatRewards>
            <h3>Combat rewards</h3>
            <ul className="bags">
                {latestSession &&
                    rewardBags.length > 0 &&
                    rewardBags.map((bag) => (
                        <Bag
                            key={bag.equipee?.key}
                            bag={bag}
                            equipIndex={bag.equipee?.key || 0}
                            ownerId={latestSession.id}
                            isInteractable={true}
                        />
                    ))}
            </ul>
        </StyledCombatRewards>
    );
};
