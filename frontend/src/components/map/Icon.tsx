import React from 'react';

const Icon = ({ position, isSelected, count, iconMask }) => {
    const commonStyles: React.CSSProperties = {
        position: `absolute`,
        width: `calc(550 * ${position?.z || 0}px)`,
        height: `calc(600 * ${position?.z || 0}px)`,
        left: `calc(${position?.x || 0} * 100vw)`,
        bottom: `calc(${position?.y || 0} * 100vh)`,
        zIndex: '2',
        marginLeft: `calc(-275 * ${position?.z || 0}px)`,
        marginTop: `calc(-275 * ${position?.z || 0}px)`,
        WebkitMaskImage: `url("/icons/HexBadge_Icons.svg")`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '100%',
        WebkitMaskPosition: `center`,
        display: 'block',
    };

    const selectedStyles: React.CSSProperties = {
        ...commonStyles,
        backgroundColor: '#fa6501',
        position: `relative`,
        left: `0px`,
        bottom: `0px`,
        marginLeft: `6%`,
        marginTop: `11%`,
    };

    const unselectedStyles: React.CSSProperties = {
        ...commonStyles,
        backgroundColor: '#000',
    };

    const renderUnitContent = (counter, position) => {
        return counter > 1 ? (
            <div
                style={{
                    width: `100%`,
                    height: `100%`,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '100%',
                    fontSize: `calc(200 * ${position?.z || 0}pt)`,
                    color: 'white',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {counter}
            </div>
        ) : (
            <div
                style={{
                    width: `100%`,
                    height: `100%`,
                    position: 'absolute',
                    WebkitMaskImage: iconMask || `url('/icons/UnitIcon.svg')`,
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: '50%',
                    WebkitMaskPosition: `center`,
                    display: 'block',
                    backgroundColor: '#FFF',
                }}
            ></div>
        );
    };

    return (
        <>
            {isSelected ? (
                <div
                    style={{
                        position: `absolute`,
                        width: `calc(620 * ${position?.z || 0}px)`,
                        height: `calc(850 * ${position?.z}px)`,
                        left: `calc(${position?.x || 0} * 100vw)`,
                        bottom: `calc(${position?.y || 0} * 100vh)`,
                        zIndex: '1',
                        marginLeft: `calc(-310 * ${position?.z || 0}px)`,
                        marginTop: `calc(-425 * ${position?.z || 0}px)`,
                        WebkitMaskImage: `url("/icons/selectedFilled.svg")`,
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskSize: '100%',
                        WebkitMaskPosition: `center`,
                        display: 'block',
                        backgroundColor: '#000',
                    }}
                >
                    <div style={selectedStyles}>{renderUnitContent(count, position)}</div>
                </div>
            ) : (
                <div style={unselectedStyles}>{renderUnitContent(count, position)}</div>
            )}
        </>
    );
};

export default Icon;
