import { CogAction, ConnectedPlayer, WorldMobileUnitFragment, ZoneWithBags } from '@app/../../core/src';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import styled from 'styled-components';

export interface OnboardingProps {
    zone: ZoneWithBags;
    player?: ConnectedPlayer;
    playerUnits: WorldMobileUnitFragment[];
    block: number;
    onClickConnect: () => void;
}

const StyledOnboarding = styled(StyledHeaderPanel)`
    width: 40rem;
    h3 {
        margin: 0;
    }
    button {
        margin-top: 0.5rem;
    }
`;

export const Onboarding = ({ player, playerUnits, onClickConnect, zone, block }: OnboardingProps) => {
    const [isSpawningMobileUnit, setIsSpawningMobileUnit] = useState<boolean>(false);

    const ACTIVE_UNIT_TIMEOUT = 10; // FIXME: value should match spawn logic
    const ZONE_UNIT_LIMIT = 1;

    const isZoneOwner = player && zone.owner && zone.owner.addr === player.addr;

    const spawnMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        if (!zone) {
            return;
        }
        const zoneId = Number(BigInt.asIntN(16, zone.key));
        const inactiveUnits = zone.mobileUnits.filter(
            (u) => u.nextLocation && u.nextLocation.time + ACTIVE_UNIT_TIMEOUT <= block
        );

        const spawnActions: CogAction[] = [{ name: 'SPAWN_MOBILE_UNIT', args: [] }];

        // We need to kick out 2 units if the owner is pushing the capacity over the limit
        // If we are the owner and there are no inactive units, we can spawn anyway
        const kickCount =
            inactiveUnits.length == 0 && isZoneOwner ? 0 : zone.mobileUnits.length > ZONE_UNIT_LIMIT ? 2 : 1;

        for (let i = 0; i < kickCount; i++) {
            const inactiveUnit = inactiveUnits[i];
            console.log('kicking inactive unit ' + i, inactiveUnit.id);
            spawnActions.push({
                name: 'KICK_UNIT_FROM_ZONE',
                args: [inactiveUnit.id],
            });
        }

        spawnActions.push({ name: 'MOVE_MOBILE_UNIT', args: [zoneId, 0, 0, 0] });

        setIsSpawningMobileUnit(true);

        player
            .dispatch(...spawnActions)
            .catch((e) => {
                console.error('failed to spawn mobileUnit:', e);
            })
            .finally(() => setIsSpawningMobileUnit(false));
    }, [block, isZoneOwner, player, zone]);

    const zoneName = zone.name?.value ? ethers.decodeBytes32String(zone.name.value) : `unnamed`;
    const zoneDescription = zone.description?.value
        ? ethers.decodeBytes32String(zone.description.value)
        : `no description`;

    const activeUnits = zone.mobileUnits.filter(
        (u) => u.nextLocation && u.nextLocation.time + ACTIVE_UNIT_TIMEOUT > block
    );

    // Zone owners can spawn into a zone even when it's at capacity
    const canSpawn = activeUnits.length < ZONE_UNIT_LIMIT || isZoneOwner;

    return (
        <StyledOnboarding>
            <div className="header">
                <h3>👁️‍🗨️ {zoneName}</h3>
            </div>
            <div className="content">
                <p></p>
                <p>
                    welcome to {zoneName}, {zoneDescription}
                </p>
                <p>There are {activeUnits.length} active units here</p>
                {!canSpawn && <p>Zone is currently full, try returning later</p>}
                {player && playerUnits.length === 0 ? (
                    <ActionButton onClick={spawnMobileUnit} disabled={isSpawningMobileUnit || !canSpawn}>
                        Enter
                    </ActionButton>
                ) : (
                    <ActionButton onClick={onClickConnect}>Connect Wallet</ActionButton>
                )}
            </div>
        </StyledOnboarding>
    );
};
