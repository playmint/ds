import { CompoundKeyEncoder, ConnectedPlayer, NodeSelectors, WorldMobileUnitFragment } from '@app/../../core/src';
import { BasePanelStyles, StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

export interface OnboardingProps {
    player?: ConnectedPlayer;
    playerUnits: WorldMobileUnitFragment[];
    onClickConnect: () => void;
}

const StyledOnboarding = styled(StyledHeaderPanel)`
    h3 {
        margin: 0;
    }
    button {
        margin-top: 0.5rem;
    }
`;

export const Onboarding = ({ player, playerUnits, onClickConnect }: OnboardingProps) => {
    const [isSpawningMobileUnit, setIsSpawningMobileUnit] = useState<boolean>(false);

    const spawnMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        const id = CompoundKeyEncoder.encodeUint160(
            NodeSelectors.MobileUnit,
            BigInt(Math.floor(Math.random() * 10000))
        );
        setIsSpawningMobileUnit(true);
        player
            .dispatch({ name: 'SPAWN_MOBILE_UNIT', args: [id] })
            .catch((e) => {
                console.error('failed to spawn mobileUnit:', e);
            })
            .finally(() => setIsSpawningMobileUnit(false));
    }, [player, setIsSpawningMobileUnit]);

    return (
        <StyledOnboarding>
            <div className="header">
                <h3>👁️‍🗨️ Welcome to Downstream</h3>
            </div>
            <div className="content">
                <p>✅ If you’re an approved playtester, simply connect your wallet and click ‘Spawn Unit’ to begin. </p>
                <p>
                    If you want to join the community, check out our{' '}
                    <a href="https://discord.gg/VdXWWNaqGN">communications server!</a>
                </p>
                {player && playerUnits.length === 0 ? (
                    <ActionButton onClick={spawnMobileUnit} disabled={isSpawningMobileUnit}>
                        Spawn Unit
                    </ActionButton>
                ) : (
                    <ActionButton onClick={onClickConnect}>Connect Wallet</ActionButton>
                )}
            </div>
        </StyledOnboarding>
    );
};
