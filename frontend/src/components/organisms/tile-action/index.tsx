import spinner from '@app/../public/loaders/spinner.svg';
import { ActionButton } from '@app/styles/button.styles';
import { PluginStateButtonAction, PluginStateComponentContent, PluginSubmitCallValues } from '@downstream/core';
import DOMPurify from 'dompurify';
import Image from 'next/image';
import { useEffect } from 'react';
import styled, { css } from 'styled-components';

const StylePluginContent = styled.div`
    position: relative;
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
    a {
        color: rgb(251, 112, 1);
        font-weight: 800;
    }
`;

// initialize DOMPurify only once
export const initDOMPurify = () => {
    const DP: any = DOMPurify;
    if (DP.inited) {
        return;
    }
    // force all links to open in new window with "noopener"
    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
        if ('target' in node) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener');
        }
    });
    DP.inited = true;
};

export const PluginLoading = () => {
    return (
        <div
            style={{
                borderRadius: 'var(--panel-border-radius)',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                opacity: '0.8',
                background: 'white',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Image src={spinner} width={48} alt="loading" style={{ display: 'inline-block' }} />
        </div>
    );
};

export const PluginContent = ({
    content,
    canUse,
    children,
}: {
    content: PluginStateComponentContent;
    canUse: boolean;
    children?: any;
}) => {
    useEffect(() => {
        initDOMPurify();
    }, []);

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
                                        type="submit"
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
