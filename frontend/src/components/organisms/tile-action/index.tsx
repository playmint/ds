/** @format */

import { FunctionComponent } from 'react';
import { sanitize } from 'dompurify';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './tile-action.styles';
import { DawnseekersClient } from '@app/contexts/dawnseekers-provider';

export interface TileActionProps extends ComponentProps {
    id: string;
    buttonHTML?: string;
    detailsHTML?: string;
    showDetails?: boolean;
    client: DawnseekersClient;
}

const StyledTileAction = styled('div')`
    ${styles}
`;

export const TileAction: FunctionComponent<TileActionProps> = (props: TileActionProps) => {
    const { client, id, buttonHTML, detailsHTML, showDetails, ...otherProps } = props;

    const clicked = (e: any) => {
        e.preventDefault();
        client.onPluginClick(id, e);
    };
    const submited = (e: any) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const values = {} as any;
        for (const entry of formData.entries()) {
            values[entry[0]] = entry[1];
        }
        client.onPluginSubmit(id, e, values);
    };

    return (
        <StyledTileAction {...otherProps}>
            {showDetails && detailsHTML ? (
                <div
                    onSubmit={submited}
                    dangerouslySetInnerHTML={detailsHTML ? { __html: sanitize(detailsHTML) } : undefined}
                />
            ) : !showDetails && buttonHTML ? (
                <div
                    onClick={clicked}
                    onSubmit={submited}
                    dangerouslySetInnerHTML={buttonHTML ? { __html: sanitize(buttonHTML) } : undefined}
                />
            ) : null}
        </StyledTileAction>
    );
};
