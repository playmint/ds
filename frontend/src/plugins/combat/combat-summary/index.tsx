/** @format */

import { ConnectedPlayer, WorldMobileUnitFragment, WorldStateFragment, WorldTileFragment } from '@app/../../core/src';
import { Dialog } from '@app/components/molecules/dialog';
import { getMaterialStats, getMobileUnitStats } from '@app/plugins/combat/helpers';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { ComponentProps } from '@app/types/component-props';
import { getSessionsAtTile } from '@downstream/core/src/utils';
import { FunctionComponent, useCallback, useState } from 'react';
import styled from 'styled-components';
import { CombatModal } from '../combat-modal';
import { styles } from './combat-summary.styles';
import { ActionButton } from '@app/styles/button.styles';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { BLOCK_TIME_SECS } from '@app/fixtures/block-time-secs';

export interface CombatSummaryProps extends ComponentProps {
    selectedTiles: WorldTileFragment[];
    player?: ConnectedPlayer;
    world?: WorldStateFragment;
    blockNumber: number;
    selectedMobileUnit?: WorldMobileUnitFragment;
}

const StyledCombatSummary = styled(StyledHeaderPanel)`
    ${styles}
`;

export const CombatSummary: FunctionComponent<CombatSummaryProps> = (props: CombatSummaryProps) => {
    const { selectedTiles, world, blockNumber, player } = props;

    const [modal, setModal] = useState<boolean>(false);
    const showModal = useCallback(() => {
        setModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setModal(false);
    }, []);

    const formattedTimeFromSeconds = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;
    };

    if (!world) return null;

    const sessions = world.sessions || [];

    // const handleFinaliseCombat = () => {
    //     if (!latestSession) {
    //         return;
    //     }
    //     if (!player) {
    //         return;
    //     }
    //     const action: CogAction = {
    //         name: 'FINALISE_COMBAT',
    //         args: [latestSession.id],
    //     };
    //     player.dispatchAndWait(action).catch((err) => console.error(err));
    // };

    const selectedTileSessions = selectedTiles.length > 0 ? getSessionsAtTile(sessions, selectedTiles[0]) : [];
    if (selectedTiles.length === 0 || selectedTileSessions.length === 0) {
        return null;
    }

    const latestSession = selectedTileSessions.sort((a, b) => {
        return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
    })[0];

    if (!latestSession.attackTile) {
        return null;
    }

    if (latestSession.isFinalised) {
        return null;
    }

    const combatStartRemainingSecs = Math.max(0, latestSession.attackTile.startBlock - blockNumber) * BLOCK_TIME_SECS;
    // const hasCombatStarted = blockNumber >= latestSession.attackTile.startBlock;

    // Find all units/buildings present on the two combat tiles
    const attackUnits = world.mobileUnits.filter((u) => u.nextLocation?.tile.id == latestSession.attackTile?.tile.id);
    const attackBuildings = world.buildings.filter((b) => b.location?.tile.id == latestSession.attackTile?.tile.id);
    const defenceUnits = world.mobileUnits.filter((u) => u.nextLocation?.tile.id == latestSession.defenceTile?.tile.id);
    const defenceBuildings = world.buildings.filter((b) => b.location?.tile.id == latestSession.defenceTile?.tile.id);

    // Get attack stats
    const attackersStats = attackUnits
        .map((u) => {
            const [life, def, atk] = getMobileUnitStats(u, world.bags);
            return { life, def, atk };
        })
        .concat(
            attackBuildings.map((b) => {
                const [life, def, atk] = getMaterialStats(b.kind?.materials || []);
                return { life, def, atk };
            })
        );

    // Get defence stats
    const defendersStats = defenceUnits
        .map((u) => {
            const [life, def, atk] = getMobileUnitStats(u, world.bags);
            return { life, def, atk };
        })
        .concat(
            defenceBuildings.map((b) => {
                const [life, def, atk] = getMaterialStats(b.kind?.materials || []);
                return { life, def, atk };
            })
        );

    // Sum up health state for both sides
    const attackersMaxHealth = attackersStats.reduce((acc, stats) => acc + stats.life, 0);
    const attackersCurrentHealth = attackersMaxHealth;
    const defendersMaxHealth = defendersStats.reduce((acc, stats) => acc + stats.life, 0);
    const defendersCurrentHealth = defendersMaxHealth;

    return (
        <StyledCombatSummary>
            {modal && player && world && blockNumber && (
                <Dialog onClose={closeModal} width="850px" height="" icon="/combat-header.png">
                    <CombatModal
                        player={player}
                        world={world}
                        closeModal={closeModal}
                        blockNumber={blockNumber}
                        session={latestSession}
                        combatStartRemainingSecs={combatStartRemainingSecs}
                    />
                </Dialog>
            )}
            <div className="header">
                <h3 className="title">Combat starts in {formattedTimeFromSeconds(combatStartRemainingSecs)}</h3>
                <img src="/combat-header.png" alt="" className="icon" />
            </div>
            {
                <div className="content">
                    <div className="attackers">
                        <span className="heading">Attackers</span>
                        <ProgressBar maxValue={attackersMaxHealth} currentValue={attackersCurrentHealth} />
                    </div>
                    <div className="defenders">
                        <span className="heading">Defenders</span>
                        <ProgressBar maxValue={defendersMaxHealth} currentValue={defendersCurrentHealth} />
                    </div>
                    <ActionButton onClick={showModal}>View Combat</ActionButton>
                    {/* {hasCombatStarted && <ActionButton onClick={handleFinaliseCombat}>End Combat</ActionButton>} */}
                </div>
            }
        </StyledCombatSummary>
    );
};
