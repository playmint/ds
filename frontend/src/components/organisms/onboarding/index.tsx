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
            .dispatch({ name: 'SPAWN_MOBILE_UNIT2', args: [id, 37, -1, -36] })
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
            .dispatch({ name: 'SPAWN_MOBILE_UNIT2', args: [id, -37, -1, 38] })
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
                <h1>Stay in The Light</h1>
                <p>
                    <ul style={{ marginLeft: '2rem' }}>
                        <li>Try to get to the middle</li>
                        <li>Construct buildings on powered tiles to extend the light</li>
                        <li>Contribute to fueling each generator to earn POW</li>
                        <li>More POW {'=>'} More life in The Dark</li>
                        <li>Watch unit power level go down in The Dark</li>
                        <li>Respawn will lose your POW</li>
                        <li>Buildings need to be lit to work</li>
                    </ul>
                </p>
                <p>Gentlemans agreement</p>
                <p>
                    <ul style={{ marginLeft: '2rem' }}>
                        <li>You will not build Generators</li>
                        <li>You will not refresh the page to reset your power level</li>
                    </ul>
                </p>
                {player && playerUnits.length === 0 ? (
                    <>
                        <ActionButton onClick={spawnMobileUnit1} disabled={isSpawningMobileUnit}>
                            Spawn East
                        </ActionButton>
                        <ActionButton onClick={spawnMobileUnit2} disabled={isSpawningMobileUnit}>
                            Spawn West
                        </ActionButton>
                    </>
                ) : (
                    <ActionButton onClick={onClickConnect}>Connect Wallet</ActionButton>
                )}
            </div>
        </StyledOnboarding>
    );
};
