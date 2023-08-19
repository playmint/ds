/** @format */

import { Fragment, ReactNode } from 'react';

export const Iterate = ({ component, number }: { component: ReactNode; number: number }) => {
    const items: ReactNode[] = [];
    for (let i = 0; i < number; i += 1) {
        items.push(component);
    }
    return (
        <Fragment>
            {items.map((item, idx) => (
                <Fragment key={idx}>{item}</Fragment>
            ))}
        </Fragment>
    );
};
