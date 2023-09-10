import spinner from '@app/../public/loaders/spinner.svg';
import { Dialog } from '@app/components/molecules/dialog';
import { trackEvent, trackPlayer } from '@app/components/organisms/analytics';
import { ethers } from 'ethers';
import Image from 'next/image';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePlayer, useWallet } from './use-game-state';
import { useLocalStorage } from './use-localstorage';
import { useWalletProvider } from './use-wallet-provider';

export interface SessionContextValue {
    newSession: () => void;
    clearSession: () => void;
}

export interface SessionData {
    key: string;
    expires: number;
    owner: string;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
export const useSession = () => useContext(SessionContext);

const decodeSessionData = (o: Partial<SessionData>): SessionData | undefined => {
    if (!o) {
        return;
    }
    if (!o.key || typeof o.key !== 'string') {
        return;
    }
    if (!o.expires || typeof o.expires !== 'number') {
        return;
    }
    if (!o.owner || typeof o.owner !== 'string') {
        return;
    }
    return o as SessionData;
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [authorizing, setAuthorizing] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { provider } = useWalletProvider();
    const { selectProvider } = useWallet();
    const player = usePlayer();
    const closeAuthroizer = useCallback(() => setAuthorizing(false), []);
    const [sessionData, setSessionData] = useLocalStorage<SessionData | null>(`ds/sessions`, null);
    const session = useMemo(() => (sessionData ? decodeSessionData(sessionData) : undefined), [sessionData]);

    useEffect(() => {
        if (!selectProvider) {
            return;
        }
        if (!provider) {
            return;
        }
        selectProvider(provider);
    }, [selectProvider, provider]);

    const newSession = useCallback(() => {
        if (!provider) {
            return;
        }
        if (!player) {
            return;
        }
        if (authorizing) {
            return;
        }
        if (!setSessionData) {
            return;
        }
        setAuthorizing(true);
        player
            .login()
            .then((session) => {
                if (session) {
                    setSessionData({
                        key: session.key.privateKey,
                        expires: session.expires,
                        owner: player.addr,
                    });
                } else {
                    setSessionData(null);
                }
                trackEvent('login', { method: provider.method });
                trackPlayer(player.addr);
            })
            .then(() => setAuthorizing(false))
            .catch((err) => console.error(err));
    }, [player, provider, authorizing, setSessionData]);

    const loadSession = useCallback(() => {
        if (!player) {
            return;
        }
        if (!session) {
            return;
        }
        if (loading) {
            return;
        }
        setLoading(true);
        player
            .load(new ethers.Wallet(session.key), session.expires)
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [session, player, loading]);

    const clearSession = useCallback(() => {
        localStorage.clear();
        if (setSessionData) {
            setSessionData(null);
        }
    }, [setSessionData]);

    useEffect(() => {
        if (!loadSession) {
            return;
        }
        if (!newSession) {
            return;
        }
        if (!player) {
            return;
        }
        if (player.active()) {
            return;
        }
        if (!setSessionData) {
            return;
        }
        if (session) {
            if (session.owner === player.addr && session.expires > Date.now()) {
                loadSession();
                return;
            } else {
                clearSession();
            }
        }
        newSession(); // TODO: auto login without prompt is bit weird
    }, [newSession, session, loadSession, player, setSessionData, clearSession]);

    const value = useMemo(() => {
        return { newSession, clearSession };
    }, [newSession, clearSession]);

    return (
        <SessionContext.Provider value={value}>
            {authorizing && (
                <Dialog onClose={closeAuthroizer} width="350px" height="">
                    <div style={{ padding: 10, lineHeight: '0px' }}>
                        <Image
                            src={spinner}
                            width={24}
                            alt="loading"
                            style={{ display: 'inline-block', filter: 'invert(1)' }}
                        />
                        <span
                            className="notice"
                            style={{
                                display: 'inline-block',
                                marginLeft: '8px',
                                position: 'relative',
                                top: '-4px',
                            }}
                        >
                            Waiting for wallet confirmation
                        </span>
                    </div>
                </Dialog>
            )}
            {children}
        </SessionContext.Provider>
    );
};
