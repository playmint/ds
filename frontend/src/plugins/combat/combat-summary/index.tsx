/** @format */

import { ConnectedPlayer, WorldMobileUnitFragment, ZoneWithBags, WorldTileFragment } from '@app/../../core/src';
import { Dialog } from '@app/components/molecules/dialog';
import { LIFE_MUL, getMaterialStats, getMobileUnitStats } from '@app/plugins/combat/helpers';
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
    zone?: ZoneWithBags;
    blockNumber: number;
    selectedMobileUnit?: WorldMobileUnitFragment;
}

const StyledCombatSummary = styled(StyledHeaderPanel)`
    ${styles}
`;

export const CombatSummary: FunctionComponent<CombatSummaryProps> = (props: CombatSummaryProps) => {
    const { selectedTiles, zone, blockNumber, player } = props;

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

    if (!zone) return null;

    const sessions = zone.sessions || [];

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
    const attackUnits = zone.mobileUnits.filter((u) => u.nextLocation?.tile.id == latestSession.attackTile?.tile.id);
    const attackBuildings = zone.buildings.filter((b) => b.location?.tile.id == latestSession.attackTile?.tile.id);
    const defenceUnits = zone.mobileUnits.filter((u) => u.nextLocation?.tile.id == latestSession.defenceTile?.tile.id);
    const defenceBuildings = zone.buildings.filter((b) => b.location?.tile.id == latestSession.defenceTile?.tile.id);

    // Get attack stats
    const attackersStats = attackUnits
        .map((u) => {
            const [life, def, atk] = getMobileUnitStats(u, zone.bags);
            return { life, def, atk };
        })
        .concat(
            attackBuildings.map((b) => {
                const [life, def, atk] = getMaterialStats(b.kind?.materials || []);
                return { life: life * LIFE_MUL, def, atk };
            })
        );

    // Get defence stats
    const defendersStats = defenceUnits
        .map((u) => {
            const [life, def, atk] = getMobileUnitStats(u, zone.bags);
            return { life, def, atk };
        })
        .concat(
            defenceBuildings.map((b) => {
                const [life, def, atk] = getMaterialStats(b.kind?.materials || []);
                return { life: life * LIFE_MUL, def, atk };
            })
        );

    // Sum up stats for both sides
    const attackersHealth = attackersStats.reduce((acc, stats) => acc + stats.life, 0);
    const attackersDefence = attackersStats.reduce((acc, stats) => acc + stats.def, 0);
    const attackersAttack = attackersStats.reduce((acc, stats) => acc + stats.atk, 0);

    const defendersHealth = defendersStats.reduce((acc, stats) => acc + stats.life, 0);
    const defendersDefence = defendersStats.reduce((acc, stats) => acc + stats.def, 0);
    const defendersAttack = defendersStats.reduce((acc, stats) => acc + stats.atk, 0);

    const attackersAttackPerTick = Math.max(1, attackersAttack - defendersDefence);
    const defendersAttackPerTick = Math.max(1, defendersAttack - attackersDefence);

    // Calculate the number of ticks each side will survive.
    // It's a very rough estimate as it is subtracting the attack from the cumulative health
    // of the other side. It doesn't take into account that the damage is only dealt to one participant per tick.
    const attackerTicksAlive = Math.floor(attackersHealth / defendersAttackPerTick);
    const defenderTicksAlive = Math.floor(defendersHealth / attackersAttackPerTick);
    // const tickDifference = Math.abs(attackerTicksAlive - defenderTicksAlive);

    const isSelectedTileAttack = latestSession.attackTile.tile.id === selectedTiles[0].id;
    const isAttackersWinning = attackerTicksAlive > defenderTicksAlive;
    const isSelectedTileWinning = isSelectedTileAttack ? isAttackersWinning : !isAttackersWinning;

    return (
        <StyledCombatSummary>
            {modal && player && zone && blockNumber && (
                <Dialog onClose={closeModal} width="850px" height="" icon="/combat-header.png">
                    <CombatModal
                        player={player}
                        zone={zone}
                        closeModal={closeModal}
                        blockNumber={blockNumber}
                        session={latestSession}
                        combatStartRemainingSecs={combatStartRemainingSecs}
                    />
                </Dialog>
            )}
            <div className="header">
                <h3 className="title">Combat {isSelectedTileAttack ? `Attack` : `Defence`} Tile</h3>
                <img src="/combat-header.png" alt="" className="icon" />
            </div>
            {
                <div className="content">
                    <p>Countdown until start of combat</p>
                    <h2 className="countdown">{formattedTimeFromSeconds(combatStartRemainingSecs)}</h2>
                    <div className="tileStats">
                        <h3>This side is {isSelectedTileWinning ? `likely to win` : `likely to lose`}</h3>
                        {/* <p>attacker health: {attackersHealth}</p>
                        <p>defender health: {defendersHealth}</p>
                        <p>attacker ticks alive: {attackerTicksAlive}</p>
                        <p>defender ticks alive: {defenderTicksAlive}</p>
                        <p>tick difference: {tickDifference}</p> */}
                    </div>

                    <ActionButton onClick={showModal}>View Combat</ActionButton>
                </div>
            }
        </StyledCombatSummary>
    );
};
