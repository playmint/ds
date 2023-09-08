import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export interface ConfigFile {
    gameID: string;
    build: string;
    wsEndpoint: string;
    httpEndpoint: string;
}

export interface ConfigContextValue extends ConfigFile {
    commit: string;
}

export const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);
export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
    const [config, setConfig] = useState<ConfigFile | undefined>();
    const commit = useMemo(() => (config?.build || '').slice(0, 8), [config?.build]);

    // load the config from file this is loaded dynamically
    // so that deployments can be configured differently by
    // mounting deployment specific config.json into the
    // container at deploy-time
    useEffect(() => {
        fetch('/config.json')
            .then((res) => res.json())
            .then(setConfig)
            .catch((err) => console.error('failed to load /config.json', err));
    }, []);

    const value = useMemo(() => {
        if (!config) {
            return undefined;
        }
        if (!commit) {
            return undefined;
        }
        return { ...config, commit };
    }, [config, commit]);

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};
