import { ConnectedPlayer, WorldMobileUnitFragment, ZoneWithBags } from '@app/../../core/src';
import { useWallet } from '@app/hooks/use-game-state';
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

    const spawnMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        if (!zone) {
            return;
        }
        const zoneId = Number(BigInt.asIntN(16, zone.key));
        setIsSpawningMobileUnit(true);
        player
            .dispatch({ name: 'SPAWN_MOBILE_UNIT', args: [] }, { name: 'MOVE_MOBILE_UNIT', args: [zoneId, 0, 0, 0] })
            .catch((e) => {
                console.error('failed to spawn mobileUnit:', e);
            })
            .finally(() => setIsSpawningMobileUnit(false));
    }, [player, setIsSpawningMobileUnit, zone]);

    const zoneName = zone.name?.value ? ethers.decodeBytes32String(zone.name.value) : `unnamed`;
    const zoneDescription = zone.description?.value
        ? ethers.decodeBytes32String(zone.description.value)
        : `no description`;

    const ACTIVE_UNIT_TIMEOUT = 10; // FIXME: value should match spawn logic
    const activeUnits = zone.mobileUnits.filter(
        (u) => u.nextLocation && u.nextLocation.time + ACTIVE_UNIT_TIMEOUT < block
    );

    const { wallet } = useWallet();
    const address = player?.addr || wallet?.address || '';
    const isZoneOwner = address === zone?.owner?.addr;

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
                        <p>Welcome to your island!</p> <br />
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
                    </fieldset>
                )}
                <br />
                <p>There are {activeUnits.length} active units here</p>
                <br />
                {player && playerUnits.length === 0 ? (
                    <ActionButton onClick={spawnMobileUnit} disabled={isSpawningMobileUnit}>
                        Enter
                    </ActionButton>
                ) : (
                    <ActionButton onClick={onClickConnect}>Connect Wallet</ActionButton>
                )}
            </div>
        </StyledOnboarding>
    );
};
