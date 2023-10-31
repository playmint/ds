// @refresh reset
import spinner from '@app/../public/loaders/spinner.svg';
import { Dialog } from '@app/components/molecules/dialog';
import { trackEvent, trackPlayer } from '@app/components/organisms/analytics';
import { ethers } from 'ethers';
import Image from 'next/image';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePlayer } from './use-game-state';
import { useLocalStorage } from './use-localstorage';
import { useWalletProvider } from './use-wallet-provider';

export const disableSessionRefresh = 'this export only exists to disable fast-refresh of this file';

export interface SessionContextValue {
    newSession: () => void;
    clearSession: () => void;
    loadingSession: boolean;
}

export interface SessionData {
    key: string;
    expires: number;
    owner: string;
}

export const SessionContext = createContext<Partial<SessionContextValue>>({});
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

const SESSION_LOCALSTORAGE_KEY = 'ds/sessions';

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const { provider } = useWalletProvider();
    const [authorizing, setAuthorizing] = useState<boolean>(false);
    const player = usePlayer();
    const closeAuthroizer = useCallback(() => setAuthorizing(false), []);
    const [sessionData, setSessionData] = useLocalStorage<SessionData | null>(SESSION_LOCALSTORAGE_KEY, null);
    const [loadingSession, setLoading] = useState<boolean>(!!sessionData);
    const session = useMemo(() => (sessionData ? decodeSessionData(sessionData) : undefined), [sessionData]);
    const [sessionLoaded, setSessionLoaded] = useState<boolean>(false);

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
        setLoading(true);
        player
            .load(new ethers.Wallet(session.key), session.expires)
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [session, player]);

    const clearSession = useCallback(() => {
        localStorage.removeItem(SESSION_LOCALSTORAGE_KEY);
        if (setSessionData) {
            setSessionData(null);
        }
    }, [setSessionData]);

    useEffect(() => {
        if (sessionLoaded) {
            return;
        }
        if (!player) {
            return;
        }
        if (player.active()) {
            setSessionLoaded(true);
            return;
        }
        if (!newSession || !clearSession || !loadSession) {
            return;
        }
        if (session) {
            if (session.owner === player.addr && session.expires > Date.now()) {
                loadSession();
                setSessionLoaded(true);
                return;
            } else {
                clearSession();
            }
        }
        setSessionLoaded(true);
        newSession(); // TODO: auto login without prompt is bit weird
    }, [newSession, loadSession, clearSession, session, sessionLoaded, player]);

    const value: SessionContextValue = useMemo(() => {
        return { newSession, clearSession, loadingSession };
    }, [newSession, clearSession, loadingSession]);

    return (
        <SessionContext.Provider value={value}>
            {authorizing && (
                <Dialog onClose={closeAuthroizer} width="390px" height="">
                    <div style={{ padding: 10, lineHeight: '0px' }}>
                        <Image src={spinner} width={24} alt="loading" style={{ display: 'inline-block' }} />
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
