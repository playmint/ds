import React from 'react';

const Icon = ({ position, isSelected, count, iconMask }) => {
    const commonStyles: React.CSSProperties = {
        position: `absolute`,
        width: `${550 * position?.z}px`,
        height: `${600 * position?.z}px`,
        left: `${position?.x * 100}vw`,
        bottom: `${position?.y * 100}vh`,
        zIndex: '2',
        marginLeft: `-${275 * position?.z}px`,
        marginTop: `-${275 * position?.z}px`,
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
                    fontSize: `${200 * position?.z}pt`,
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
                        width: `${620 * position?.z}px`,
                        height: `${850 * position?.z}px`,
                        left: `${position?.x * 100}vw`,
                        bottom: `${position?.y * 100}vh`,
                        zIndex: '1',
                        marginLeft: `-${310 * position?.z}px`,
                        marginTop: `-${425 * position?.z}px`,
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
