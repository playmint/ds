/** @format */

import { PluginStateButtonAction, PluginStateComponentContent, PluginSubmitCallValues } from '@downstream/core';
import DOMPurify from 'dompurify';

export const PluginContent = ({ content, children }: { content: PluginStateComponentContent; children: any }) => {
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
        <div className="content">
            <form onSubmit={submit}>
                <div dangerouslySetInnerHTML={saferHTML} />
                {children}
                <div style={{ marginTop: '1rem', width: '100%' }}>
                    {content.buttons?.map((btn) => {
                        switch (btn.type) {
                            case 'action':
                                return (
                                    <button
                                        disabled={btn.disabled}
                                        className="action-button"
                                        key={btn.text}
                                        onClick={() => clickActionButton(btn)}
                                    >
                                        {btn.text}
                                    </button>
                                );
                            case 'toggle':
                                return (
                                    <button disabled={btn.disabled} className="action-button" key={btn.text}>
                                        {btn.text}
                                    </button>
                                );
                            default:
                                return 'undefined';
                        }
                    })}
                </div>
            </form>
        </div>
    );
};
