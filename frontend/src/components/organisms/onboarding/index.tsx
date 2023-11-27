import { CompoundKeyEncoder, ConnectedPlayer, NodeSelectors, WorldMobileUnitFragment } from '@app/../../core/src';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

export interface OnboardingProps {
    player?: ConnectedPlayer;
    playerUnits: WorldMobileUnitFragment[];
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

export const Onboarding = ({ player, playerUnits, onClickConnect }: OnboardingProps) => {
    const [isSpawningMobileUnit, setIsSpawningMobileUnit] = useState<boolean>(false);

    const spawnMobileUnit1 = useCallback(() => {
        if (!player) {
            return;
        }
        const key = Math.floor(Math.random() * 10000);
        const id = CompoundKeyEncoder.encodeUint160(NodeSelectors.MobileUnit, BigInt(key));
        setIsSpawningMobileUnit(true);
        player
            .dispatch({ name: 'SPAWN_MOBILE_UNIT', args: [id] }, { name: 'MOVE_MOBILE_UNIT', args: [key, 0, 31, -31] })
            .catch((e) => {
                console.error('failed to spawn mobileUnit:', e);
            })
            .finally(() => setIsSpawningMobileUnit(false));
    }, [player, setIsSpawningMobileUnit]);

    const spawnMobileUnit2 = useCallback(() => {
        if (!player) {
            return;
        }
        const key = Math.floor(Math.random() * 10000);
        const id = CompoundKeyEncoder.encodeUint160(NodeSelectors.MobileUnit, BigInt(key));
        setIsSpawningMobileUnit(true);
        player
            .dispatch({ name: 'SPAWN_MOBILE_UNIT', args: [id] }, { name: 'MOVE_MOBILE_UNIT', args: [key, -29, 7, 22] })
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
                    <a href="https://discord.gg/VdXWWNaqGN" target="_blank" rel="noopener noreferrer">
                        communications server!
                    </a>
                </p>
                {player && playerUnits.length === 0 ? (
                    <>
                        <ActionButton onClick={spawnMobileUnit1} disabled={isSpawningMobileUnit}>
                            Spawn North
                        </ActionButton>
                        <ActionButton onClick={spawnMobileUnit2} disabled={isSpawningMobileUnit}>
                            Spawn South
                        </ActionButton>
                    </>
                ) : (
                    <ActionButton onClick={onClickConnect}>Connect Wallet</ActionButton>
                )}
            </div>
        </StyledOnboarding>
    );
};
