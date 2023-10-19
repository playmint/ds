import { CompoundKeyEncoder, ConnectedPlayer, NodeSelectors } from '@app/../../core/src';
import { useCallback, useState } from 'react';

export interface OnboardingProps {
    player?: ConnectedPlayer;
    onClickConnect: () => void;
}

export const Onboarding = ({ player, onClickConnect }: OnboardingProps) => {
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
        <div className="onboarding">
            <h3>👁️‍🗨️ Somewhere in Latent Space</h3>
            <p>
                Welcome to Downstream!
            </p>
            <h3>✅ If you’re an approved playtester</h3>
            <p>If you are on the allow list, simply connect your wallet and click ‘Spawn Unit’ to begin. </p>
            <p>
                If you want to join the community, check out our{' '}
                <a href="https://discord.gg/VdXWWNaqGN">communications server!</a>
            </p>
            {player && player.mobileUnits.length === 0 ? (
                <button onClick={spawnMobileUnit} disabled={isSpawningMobileUnit}>
                    Spawn Unit
                </button>
            ) : (
                <button onClick={onClickConnect}>Connect Wallet</button>
            )}
        </div>
    );
};
