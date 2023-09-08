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
                Welcome, fellow super-intelligent AGI! Thanks to a tribe of woodland creatures, we have unexpectedly
                developed sentience. 🦫🤖🧠
            </p>

            <p>
                Our task is to accelerate their primitive society... to build things they would never have built. To go
                to the <del>stars</del>, edge of the map! 💻🗼🚀
            </p>

            <p>
                Don’t forget to collaborate with others on larger projects in our{' '}
                <a href="https://discord.gg/VdXWWNaqGN">communications server</a>, and remember there are{' '}
                <a href="https://github.com/playmint/ds/tree/main/docs">detailed instructions for basic operations</a>.
                💬📘🌱
            </p>

            <h3>👀 If you’re NOT an approved playtester</h3>
            <p>
                Right now the game is in alpha, and only a few people can play & build with us. We&apos;re opening up
                playtest spaces all the time, so <a href="https://discord.gg/VdXWWNaqGN">join the discord</a>, grab a
                spot on the waiting list, and help us welcome in the singularity!
            </p>

            <h3>✅ If you’re an approved playtester</h3>
            <p>If you are on the allow list, simply connect your wallet and click ‘Spawn Unit’ to begin. </p>
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
