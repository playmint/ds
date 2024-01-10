import React from 'react';

const Label = ({ text, position }) => {
    const commonStyles: React.CSSProperties = {
        position: `absolute`,
        width: `calc(550 * ${position?.z || 0}px)`,
        height: `calc(600 * ${position?.z || 0}px)`,
        left: `calc(${position?.x || 0} * 100vw)`,
        bottom: `calc(${position?.y || 0} * 100vh)`,
        zIndex: '2',
        marginLeft: `calc(-275 * ${position?.z || 0}px)`,
        marginTop: `calc(-275 * ${position?.z || 0}px)`,
        display: 'block',
    };
    const unselectedStyles: React.CSSProperties = {
        ...commonStyles,
        backgroundColor: '#000',
    };

    const renderUnitContent = (text, position) => {
        return (
            <div
                style={{
                    width: `100%`,
                    height: `100%`,
                    position: 'absolute',
                    display: 'block',
                    backgroundColor: '#FFF',
                    fontSize: `calc(100 * ${position?.z || 0}px)`,
                }}
            >
                {text}
            </div>
        );
    };

    return (
        <>
            <div style={unselectedStyles}>{renderUnitContent(text, position)}</div>
        </>
    );
};

export default Label;
