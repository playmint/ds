import { CogAction, ConnectedPlayer, WorldMobileUnitFragment, ZoneWithBags } from '@app/../../core/src';
import { decodeString } from '@app/helpers';
import { useWallet } from '@app/hooks/use-game-state';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useConfig } from '@app/hooks/use-config';

export interface OnboardingProps {
    zone: ZoneWithBags;
    player?: ConnectedPlayer;
    playerUnits: WorldMobileUnitFragment[];
    block: number;
    unitTimeoutBlocks: number;
    zoneUnitLimit: number;
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

export const Onboarding = ({
    player,
    playerUnits,
    onClickConnect,
    zone,
    block,
    unitTimeoutBlocks,
    zoneUnitLimit,
}: OnboardingProps) => {
    const [isSpawningMobileUnit, setIsSpawningMobileUnit] = useState<boolean>(false);

    const zoneId = Number(BigInt.asIntN(16, zone.key));
    const spawnMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        if (!zone) {
            return;
        }

        const inactiveUnits = zone.mobileUnits.filter(
            (u) => u.nextLocation && u.nextLocation.time + unitTimeoutBlocks <= block
        );

        const spawnActions: CogAction[] = [{ name: 'SPAWN_MOBILE_UNIT', args: [] }];

        // We need to kick out 2 units if the owner is pushing the capacity over the limit
        // If we are the owner and there are no inactive units, we can spawn anyway
        const kickCount = Math.min(inactiveUnits.length, zone.mobileUnits.length > zoneUnitLimit ? 2 : 1);

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
    }, [block, player, unitTimeoutBlocks, zone, zoneId, zoneUnitLimit]);

    const zoneName = zone.name?.value ? decodeString(zone.name.value) : `unnamed`;
    const zoneDescription = zone.description?.value ? zone.description.value : `no description`;

    const activeUnits = zone.mobileUnits.filter(
        (u) => u.nextLocation && u.nextLocation.time + unitTimeoutBlocks > block
    );

    const { wallet } = useWallet();
    const address = player?.addr || wallet?.address || '';
    const isZoneOwner = address === zone?.owner?.addr;
    // Zone owners can spawn into a zone even when it's at capacity
    const canSpawn = activeUnits.length < zoneUnitLimit || isZoneOwner;

    const networkName = useConfig()?.networkName;
    const network = networkName === 'hexwoodlocal' ? 'local' : networkName;

    return (
        <StyledOnboarding>
            <div className="header">
                <h3>{zoneName}</h3>
                <div className="description">
                    <p>{zoneDescription}</p>
                </div>
            </div>

            <div className="content">
                <p></p>
                {isZoneOwner && (
                    <fieldset>
                        <legend>Owner Information</legend>
                        <p>Welcome to your zone!</p> <br />
                        <p>Here are some links you might find useful:</p>
                        <a
                            href="https://github.com/playmint/ds/tree/main/tutorial#readme"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Builder Tutorials
                        </a>
                        <br />
                        <a href="/tile-fabricator" target="_blank" rel="noopener noreferrer">
                            Tile Fabricator
                        </a>
                        <br />
                        <a href="/building-fabricator" target="_blank" rel="noopener noreferrer">
                            Building Fabricator
                        </a>
                        <br />
                        <br />
                        <p>
                            Run this command in the{' '}
                            <a
                                href="https://github.com/playmint/ds/blob/main/contracts/src/maps/tutorial-room-1/README.md#4-deploy-the-new-tiles"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ds-cli
                            </a>{' '}
                            to deploy a map to your zone:
                        </p>
                        <b>
                            ds apply -n {network} -z {zoneId} -R -f .
                        </b>
                    </fieldset>
                )}
                <br />
                <p>There are {activeUnits.length} active units here</p>

                <br />

                {!canSpawn && <p>Zone is currently full, try returning later</p>}

                {player && playerUnits.length === 0 ? (
                    <ActionButton onClick={spawnMobileUnit} disabled={isSpawningMobileUnit || !canSpawn}>
                        Enter
                    </ActionButton>
                ) : playerUnits.length > 0 ? null : (
                    <ActionButton onClick={onClickConnect}>Connect Wallet</ActionButton>
                )}
            </div>
        </StyledOnboarding>
    );
};
