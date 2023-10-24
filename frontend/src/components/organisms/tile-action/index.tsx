/** @format */

import { ActionButton } from '@app/styles/button.styles';
import { PluginStateButtonAction, PluginStateComponentContent, PluginSubmitCallValues } from '@downstream/core';
import DOMPurify from 'dompurify';
import styled, { css } from 'styled-components';

const StylePluginContent = styled.div`
    ${({ canUse }: { canUse: boolean }) => css`
        opacity: ${canUse ? 1 : 0.5};
    `}

    .buttonContainer {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
        width: 100%;
    }
`;

export const PluginContent = ({
    content,
    canUse,
    children,
}: {
    content: PluginStateComponentContent;
    canUse: boolean;
    children?: any;
}) => {
    const saferHTML = { __html: content.html ? DOMPurify.sanitize(content.html) : '' };

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!content.submit) {
            return;
        }
        const formData = new FormData(e.currentTarget);
        const values: PluginSubmitCallValues = {};
        for (const entry of formData.entries()) {
            values[entry[0]] = entry[1].toString();
        }
        content.submit(values).catch((err) => console.error(`submit fail: ${err}`));
    };

    const clickActionButton = (btn: PluginStateButtonAction) => {
        btn.action().catch((err) => console.error('btn action fail:', err)); // TODO: I think we should suspend here
    };

    return (
        <StylePluginContent canUse={canUse} className="content">
            <form onSubmit={submit}>
                <div dangerouslySetInnerHTML={saferHTML} />
                {children}
                <div className="buttonContainer">
                    {content.buttons?.map((btn) => {
                        switch (btn.type) {
                            case 'action':
                                return (
                                    <ActionButton
                                        disabled={!canUse || btn.disabled}
                                        key={btn.text}
                                        onClick={() => clickActionButton(btn)}
                                    >
                                        {btn.text}
                                    </ActionButton>
                                );
                            case 'toggle':
                                return (
                                    <ActionButton disabled={!canUse || btn.disabled} key={btn.text}>
                                        {btn.text}
                                    </ActionButton>
                                );
                            default:
                                return 'undefined';
                        }
                    })}
                </div>
            </form>
        </StylePluginContent>
    );
};
