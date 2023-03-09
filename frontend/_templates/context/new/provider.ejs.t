---
to: src/contexts/<%= h.changeCase.param(name) %>-provider.tsx
---
/** @format */

import { createContext, ReactNode, useContext } from 'react';

export interface <%= h.changeCase.pascal(name) %>ContextProviderProps {
    children?: ReactNode
}

export interface <%= h.changeCase.pascal(name) %>ContextStore {}

export const <%= h.changeCase.pascal(name) %>Context = createContext<<%= h.changeCase.pascal(name) %>ContextStore>({} as <%= h.changeCase.pascal(name) %>ContextStore);

export const use<%= h.changeCase.pascal(name) %>Context = () => useContext(<%= h.changeCase.pascal(name) %>Context);

export const <%= h.changeCase.pascal(name) %>Provider = ({ children }: <%= h.changeCase.pascal(name) %>ContextProviderProps) => {
    const store: <%= h.changeCase.pascal(name) %>ContextStore = {};
    return <<%= h.changeCase.pascal(name) %>Context.Provider value={store}>{children}</<%= h.changeCase.pascal(name) %>Context.Provider>;
};
