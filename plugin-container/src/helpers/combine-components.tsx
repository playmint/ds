/** @format */

import { ComponentProps, Fragment, FunctionComponent, ReactNode } from 'react';

/**
 * Combine the array of given components into a single component to reduce
 * nesting. This is especially useful when dealing with a large number of
 * top level context providers.
 *
 * Usage:
 * const providers = [ContextProviderOne, ContextProvider2];
 * const CombinedContextProviders = combineComponents(...providers);
 * return <CombinedContextProviders>{children}</CombinedContextProviders>;
 *
 * @param components an array of components to combine
 */
export function combineComponents(...components: any[]): any {
    return components.reduce(
        (AccumulatedComponents, CurrentComponent) => {
            return ({ children }: ComponentProps<FunctionComponent>): JSX.Element => {
                return (
                    <AccumulatedComponents>
                        <CurrentComponent>{children}</CurrentComponent>
                    </AccumulatedComponents>
                );
            };
        },
        ({ children }: { children: ReactNode }) => <Fragment>{children}</Fragment>
    );
}
