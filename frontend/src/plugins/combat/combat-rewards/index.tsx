/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './combat-rewards.styles';
import { ConnectedPlayer, SelectedSeekerFragment, SelectedTileFragment } from '@dawnseekers/core';
import { Bag } from '@app/plugins/inventory/bag';

export interface CombatRewardsProps extends ComponentProps {
    selectedTiles: SelectedTileFragment[];
    player?: ConnectedPlayer;
    selectedSeeker?: SelectedSeekerFragment;
}

const StyledCombatRewards = styled('div')`
    ${styles}
`;

export const CombatRewards: FunctionComponent<CombatRewardsProps> = (props: CombatRewardsProps) => {
    const { selectedTiles, player, selectedSeeker, ...otherProps } = props;

    const latestSession =
        selectedTiles.length > 0 &&
        selectedTiles[0].sessions.length > 0 &&
        selectedTiles[0].sessions[selectedTiles[0].sessions.length - 1];

    const rewardBags =
        latestSession && selectedSeeker
            ? latestSession.bags.filter((equipSlot) => {
                  // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of SeekerID
                  // bagIDs are 64bits
                  const seekerIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                  const bagSeekerID = (BigInt(equipSlot.bag.id) >> BigInt(16)) & seekerIdMask;
                  const truncatedSeekerID = BigInt(selectedSeeker.id) & seekerIdMask;
                  return bagSeekerID === truncatedSeekerID;
              })
            : [];

    if (rewardBags.length === 0) {
        return null;
    }

    if (!rewardBags.some((e) => e.bag.slots.some((s) => s.balance > 0))) {
        return null;
    }

    return (
        <StyledCombatRewards {...otherProps}>
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
                            as="li"
                        />
                    ))}
            </ul>
        </StyledCombatRewards>
    );
};
