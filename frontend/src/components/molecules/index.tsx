// import userIcon from './images/user-01.png';
// import DownstreamLogo from '@app/assets/downstream-logo-dark.svg';
import userIcon from '@app/assets/user-01.svg';
import buttonRing from '@app/assets/buttonRing.svg';
import signInOff from '@app/assets/log-in-03.svg';
import signInOn from '@app/assets/log-in-03-white.svg';
import playmintLogo from '@app/assets/playmint-footer-logo.svg';
import downstreamLogo from '@app/assets/downstream-title.svg';
import iconInfo from '@app/assets/icon-info.svg';
import iconDiscord from '@app/assets/icon-discord.svg';
import iconSparkles from '@app/assets/icon-sparkles.svg';
import stickerEye from '@app/assets/sticker-eye.png';
import stickerUnit from '@app/assets/sticker-unit.png';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

export const Sticker = ({ image, style }: { image: 'eye' | 'unit'; style: React.CSSProperties }) => {
    const iconSrc = useMemo(() => {
        switch (image) {
            case 'eye':
                return stickerEye;
            case 'unit':
                return stickerUnit;
            default:
                return '';
        }
    }, [image]);
    return <Image src={iconSrc} alt="unit" style={{ position: 'relative', ...style }} />;
};

export const IconButton = ({ onClick, icon }: { onClick: () => void; icon: 'info' | 'discord' }) => {
    const iconSrc = (() => {
        switch (icon) {
            case 'info':
                return iconInfo;
            case 'discord':
                return iconDiscord;
            default:
                return '';
        }
    })();
    return (
        <div
            style={{
                width: '64px',
                height: '64px',
                padding: 3,
                background: '#24202B',
                boxShadow: '0px 2px 0px white',
                borderRadius: 8,
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 2,
                display: 'inline-flex',
            }}
            onClick={onClick}
        >
            <div
                style={{
                    width: 58,
                    height: 58,
                    paddingLeft: 16,
                    paddingRight: 16,
                    background:
                        'linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%), linear-gradient(180deg, #EDEBF2 0%, rgba(228, 225, 235, 0) 66%)',
                    boxShadow: '0px 2px 0px white inset',
                    borderRadius: 5.5,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                    display: 'flex',
                    cursor: 'pointer',
                }}
            >
                <Image src={iconSrc} alt="link" />
            </div>
        </div>
    );
};

export const EmbossedTopPanel = ({}) => (
    <div style={{ width: '100%', height: '5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', top: '-3rem', position: 'relative' }}>
            <div
                style={{
                    width: 1216,
                    height: 72,
                    left: 0,
                    top: 0,
                    position: 'absolute',
                    background: '#E4E1EB',
                    boxShadow: '0px 2px 0px white',
                    borderRadius: 10,
                    border: '2px #A8A2B5 solid',
                }}
            />
            <div
                style={{
                    width: 12,
                    height: 12,
                    left: 16,
                    top: 45,
                    position: 'absolute',
                    background: '#A8A2B5',
                    boxShadow: '0px 2px 0px rgba(255, 255, 255, 0.40)',
                    borderRadius: 9999,
                    border: '2px #90879E solid',
                }}
            />
            <div
                style={{
                    width: 12,
                    height: 12,
                    left: 1187,
                    top: 45,
                    position: 'absolute',
                    background: '#A8A2B5',
                    boxShadow: '0px 2px 0px rgba(255, 255, 255, 0.40)',
                    borderRadius: 9999,
                    border: '2px #90879E solid',
                }}
            />
        </div>
    </div>
);

export const EmbossedBottomPanel = ({}) => (
    <div style={{ width: '100%', height: '5rem', position: 'relative', overflow: 'hidden' }}>
        <div
            style={{
                width: '100%',
                height: '100%',
                top: '0rem',
                position: 'relative',
                transform: 'rotate(-180deg)',
                transformOrigin: '0 0',
            }}
        >
            <div
                style={{
                    width: 1216,
                    height: 72,
                    left: 0,
                    top: 0,
                    position: 'absolute',
                    transform: 'rotate(-180deg)',
                    transformOrigin: '0 0',
                    background: '#E4E1EB',
                    boxShadow: '0px 2px 0px white',
                    borderRadius: 10,
                    border: '2px #A8A2B5 solid',
                }}
            />
            <div
                style={{
                    width: 12,
                    height: 12,
                    left: -16,
                    top: -12,
                    position: 'absolute',
                    transform: 'rotate(-180deg)',
                    transformOrigin: '0 0',
                    background: '#A8A2B5',
                    boxShadow: '0px 2px 0px rgba(255, 255, 255, 0.40)',
                    borderRadius: 9999,
                    border: '2px #90879E solid',
                }}
            />
            <div
                style={{
                    width: 12,
                    height: 12,
                    left: -1187,
                    top: -12,
                    position: 'absolute',
                    transform: 'rotate(-180deg)',
                    transformOrigin: '0 0',
                    background: '#A8A2B5',
                    boxShadow: '0px 2px 0px rgba(255, 255, 255, 0.40)',
                    borderRadius: 9999,
                    border: '2px #90879E solid',
                }}
            />
        </div>
    </div>
);

export const PlaymintFooter = () => (
    <div style={{ width: '100%', height: '130px', position: 'relative', marginTop: 48 }}>
        <div
            style={{
                left: 449,
                top: 48,
                position: 'absolute',
                color: '#90879E',
                fontSize: 14,
                fontFamily: 'Recursive',
                fontWeight: '500',
                wordWrap: 'break-word',
            }}
        >
            © 2024 Copyright Playmint. All rights reserved.
        </div>
        <div
            style={{
                width: 184.38,
                height: 102.33,
                position: 'absolute',
                top: 8,
                boxShadow: '0px 1.8438355922698975px 0px white',
            }}
        >
            <Image
                src={playmintLogo}
                alt="Playmint"
                style={{ width: 184, height: 102, position: 'absolute', left: -2, overflow: 'hidden' }}
            />
        </div>
        <div style={{ width: 206.37, height: 102, left: 1010, top: 0, position: 'absolute' }}>
            <div style={{ width: 52.19, height: 102, left: 0, top: 0, position: 'absolute' }}>
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 80.65,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 40.33,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 30.84,
                        top: 59.3,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 0,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 30.84,
                        top: 18.98,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
            </div>
            <div style={{ width: 52.19, height: 102, left: 61.67, top: -0, position: 'absolute' }}>
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: -0,
                        top: 80.65,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: -0,
                        top: 40.33,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 30.84,
                        top: 59.3,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 0,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 30.84,
                        top: 18.98,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
            </div>
            <div style={{ width: 52.19, height: 102, left: 123.35, top: -0, position: 'absolute' }}>
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 80.65,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 40.33,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 30.84,
                        top: 59.3,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 0,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 30.84,
                        top: 18.98,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
            </div>
            <div style={{ width: 21.35, height: 102, left: 185.02, top: -0, position: 'absolute' }}>
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: -0,
                        top: 80.65,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: -0,
                        top: 40.33,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
                <div
                    style={{
                        width: 21.35,
                        height: 21.35,
                        left: 0,
                        top: 0,
                        position: 'absolute',
                        background:
                            'linear-gradient(0deg, #3D3748 0%, #3D3748 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0) 100%)',
                        boxShadow: '0px 4px 0px black inset',
                        borderRadius: 209.3,
                    }}
                />
            </div>
        </div>
    </div>
);

export const DownstreamLogo = () => <Image src={downstreamLogo} alt="Downstream" />;

export const ZoneRow = ({
    id,
    name,
    description,
    activeUnits,
    maxUnits,
    imageURL,
    onClickEnter,
    ownerAddress,
}: {
    id: number;
    name: string;
    description: string;
    activeUnits: number;
    maxUnits: number;
    imageURL: string;
    ownerAddress: string;
    onClickEnter: (id: number) => void;
}) => {
    const [active, setActive] = useState(false);

    const onMouseOver = useCallback(() => {
        setActive(true);
    }, []);
    const onMouseOut = useCallback(() => {
        setActive(false);
    }, []);

    const onClickEnterZone = useCallback(() => {
        onClickEnter(id);
    }, [onClickEnter, id]);

    return (
        <div style={{ paddingTop: 10, margin: '8px 0' }}>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    padding: 3,
                    background: '#24202B',
                    boxShadow: '0px 2px 0px white',
                    borderRadius: 12,
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    gap: 3,
                    display: 'inline-flex',
                }}
            >
                <div
                    style={{
                        width: 140,
                        alignSelf: 'stretch',
                        paddingLeft: 16,
                        paddingRight: 16,
                        paddingTop: 14,
                        paddingBottom: 14,
                        background: 'linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%)',
                        boxShadow: '0px 3px 0px white inset',
                        borderRadius: 9.5,
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 24,
                        display: 'flex',
                    }}
                >
                    <div
                        style={{
                            width: 108,
                            height: 108,
                            padding: 2.77,
                            background: '#24202B',
                            boxShadow: '0px 1.8438355922698975px 0px white',
                            borderRadius: 6,
                            overflow: 'hidden',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 2.77,
                            display: 'flex',
                        }}
                    >
                        <div
                            style={{
                                width: 102.47,
                                height: 102.47,
                                position: 'relative',
                                background:
                                    'linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%), linear-gradient(180deg, #CFCBD7 0%, rgba(228, 225, 235, 0) 66%), linear-gradient(0deg, #251313 0%, #251313 100%), radial-gradient(66.84% 66.84% at 33.42% 33.42%, white 22%, rgba(255, 255, 255, 0) 79%)',
                                boxShadow: '0px 0px 27px rgba(0, 0, 0, 0.72) inset',
                                borderRadius: 4,
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundImage: `url('${imageURL}')`,
                                    backgroundSize: 'cover',
                                }}
                            />
                            <div
                                style={{
                                    width: 189.23,
                                    height: 186.07,
                                    left: -3,
                                    top: -3,
                                    position: 'absolute',
                                    opacity: 0.06,
                                }}
                            ></div>

                            <div
                                style={{
                                    width: 94,
                                    height: 53,
                                    left: 4.23,
                                    top: 3.23,
                                    position: 'absolute',
                                    opacity: 0.32,
                                    mixBlendMode: 'overlay',
                                    background: 'linear-gradient(143deg, white 0%, white 100%)',
                                    borderRadius: 3,
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        flex: '1 1 0',
                        alignSelf: 'stretch',
                        paddingLeft: 24,
                        paddingRight: 24,
                        paddingTop: 14,
                        paddingBottom: 14,
                        background: 'linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%)',
                        boxShadow: '0px 3px 0px white inset',
                        borderRadius: 9.5,
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 24,
                        display: 'flex',
                    }}
                >
                    <div
                        style={{
                            width: 587,
                            alignSelf: 'stretch',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'flex-start',
                            gap: 12,
                            display: 'inline-flex',
                        }}
                    >
                        <div
                            style={{
                                alignSelf: 'stretch',
                                flex: '1 1 0',
                                flexDirection: 'column',
                                justifyContent: 'flex-start',
                                alignItems: 'flex-start',
                                gap: 4,
                                display: 'flex',
                            }}
                        >
                            <div
                                style={{
                                    alignSelf: 'stretch',
                                    color: '#0D090F',
                                    fontSize: 24,
                                    fontFamily: 'Recursive',
                                    fontWeight: '800',
                                    wordWrap: 'break-word',
                                    cursor: 'pointer',
                                }}
                                onClick={onClickEnterZone}
                            >
                                {name}
                            </div>
                            <div
                                style={{
                                    alignSelf: 'stretch',
                                    color: '#0D090F',
                                    fontSize: 16,
                                    fontFamily: 'Recursive',
                                    fontWeight: '500',
                                    wordWrap: 'break-word',
                                }}
                            >
                                {description}
                            </div>
                        </div>
                        <div
                            style={{
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                gap: 8,
                                display: 'inline-flex',
                            }}
                        >
                            <div style={{ width: 16, height: 16, position: 'relative' }}>
                                <div
                                    style={{
                                        width: 16,
                                        height: 16,
                                        left: 0,
                                        top: 0,
                                        position: 'absolute',
                                    }}
                                >
                                    <Image src={userIcon} alt="user" />
                                </div>
                            </div>
                            <div
                                style={{
                                    color: '#90879E',
                                    fontSize: 14,
                                    fontFamily: 'Recursive',
                                    fontWeight: '500',
                                    wordWrap: 'break-word',
                                }}
                            >
                                {ownerAddress}
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        width: 209,
                        alignSelf: 'stretch',
                        padding: 16,
                        background: 'linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%)',
                        boxShadow: '0px 3px 0px white inset',
                        borderRadius: 9.5,
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 16,
                        display: 'inline-flex',
                    }}
                >
                    <div
                        style={{
                            color: '#90879E',
                            fontSize: 14,
                            fontFamily: 'Recursive',
                            fontWeight: '500',
                            wordWrap: 'break-word',
                        }}
                    >
                        CURRENT PLAYERS
                    </div>
                    <div
                        style={{
                            alignSelf: 'stretch',
                            flex: '1 1 0',
                            paddingLeft: 45,
                            paddingRight: 45,
                            paddingTop: 21,
                            paddingBottom: 21,
                            background: '#EAE8F0',
                            boxShadow: '0px 2px 0px rgba(0, 0, 0, 0.06) inset',
                            borderRadius: 6,
                            overflow: 'hidden',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 8,
                            display: 'inline-flex',
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    color: '#0D090F',
                                    fontSize: 24,
                                    fontFamily: 'Recursive',
                                    fontWeight: '800',
                                    wordWrap: 'break-word',
                                }}
                            >
                                {activeUnits < 10 ? `0${activeUnits}` : activeUnits}{' '}
                            </span>
                            <span
                                style={{
                                    color: 'rgba(13, 9, 15, 0.16)',
                                    fontSize: 24,
                                    fontFamily: 'Recursive',
                                    fontWeight: '400',
                                    wordWrap: 'break-word',
                                }}
                            >
                                /
                            </span>
                            <span
                                style={{
                                    color: '#0D090F',
                                    fontSize: 24,
                                    fontFamily: 'Recursive',
                                    fontWeight: '800',
                                    wordWrap: 'break-word',
                                }}
                            >
                                {' '}
                                {maxUnits < 10 ? `0${maxUnits}` : maxUnits}
                            </span>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        width: 136,
                        alignSelf: 'stretch',
                        paddingLeft: 16,
                        paddingRight: 16,
                        background: 'linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%)',
                        boxShadow: '0px 3px 0px white inset',
                        borderRadius: 9.5,
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 12,
                        display: 'flex',
                    }}
                    onMouseOver={onMouseOver}
                    onMouseOut={onMouseOut}
                    onMouseDown={onClickEnterZone}
                >
                    {active ? (
                        <div style={{ width: 112, height: 112, position: 'relative' }}>
                            <div
                                style={{
                                    width: 112,
                                    height: 112,
                                    left: 0,
                                    top: 0,
                                    position: 'absolute',
                                    background:
                                        'linear-gradient(129deg, rgba(255, 255, 255, 0) 7%, rgba(0, 0, 0, 0.08) 100%)',
                                    borderRadius: 9999,
                                    filter: 'blur(1px)',
                                }}
                            >
                                <Image src={buttonRing} alt="buttonRing" />
                            </div>
                            <div style={{ width: 82, height: 82, left: 15, top: 15, position: 'absolute' }}>
                                <div
                                    style={{
                                        width: 82,
                                        height: 82,
                                        left: 0,
                                        top: 0,
                                        position: 'absolute',
                                        background:
                                            'linear-gradient(0deg, #FB7001 0%, #FB7001 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.24) 12%, rgba(251, 112, 1, 0) 51%, rgba(255, 255, 255, 0.18) 87%), linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%), linear-gradient(180deg, #CFCBD7 0%, rgba(228, 225, 235, 0) 66%)',
                                        boxShadow: '0px 1.8466076850891113px 0px white',
                                        borderRadius: 9999,
                                        border: '2.77px #24202B solid',
                                        cursor: 'pointer',
                                    }}
                                />
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        left: 25,
                                        top: 25,
                                        position: 'absolute',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Image src={signInOn} alt="" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ width: 112, height: 112, position: 'relative' }}>
                            <div
                                style={{
                                    width: 112,
                                    height: 112,
                                    left: 0,
                                    top: 0,
                                    position: 'absolute',
                                    // background:
                                    //     'linear-gradient(129deg, rgba(255, 255, 255, 0) 7%, rgba(0, 0, 0, 0.08) 100%)',
                                    borderRadius: 9999,
                                    filter: 'blur(1px)',
                                }}
                            >
                                <Image src={buttonRing} alt="buttonRing" />
                            </div>
                            <div style={{ width: 82, height: 82, left: 15, top: 15, position: 'absolute' }}>
                                <div
                                    style={{
                                        width: 82,
                                        height: 82,
                                        left: 0,
                                        top: 0,
                                        position: 'absolute',
                                        // background:
                                        //     'linear-gradient(0deg, #FB7001 0%, #FB7001 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.24) 12%, rgba(251, 112, 1, 0) 51%, rgba(255, 255, 255, 0.18) 87%), linear-gradient(0deg, #F7F5FA 0%, #F7F5FA 100%), linear-gradient(180deg, #CFCBD7 0%, rgba(228, 225, 235, 0) 66%)',
                                        boxShadow: '0px 1.8466076850891113px 0px white',
                                        borderRadius: 9999,
                                        border: '2.77px #24202B solid',
                                    }}
                                />
                                <div style={{ width: 32, height: 32, left: 25, top: 25, position: 'absolute' }}>
                                    <Image src={signInOff} alt="" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const Rivet = ({ styles }: { styles?: React.CSSProperties }) => (
    <div
        style={{
            width: 12,
            height: 12,
            background: '#A8A2B5',
            boxShadow: '0px 2px 0px rgba(255, 255, 255, 0.40)',
            borderRadius: 9999,
            border: '2px #90879E solid',
            position: 'absolute',
            ...styles,
        }}
    />
);

export const HeroText = ({ children }: { children: React.ReactNode }) => (
    <div
        style={{
            textAlign: 'center',
            color: '#3D3748',
            fontSize: 64,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 1.92,
            wordWrap: 'break-word',
        }}
    >
        {children}
    </div>
);

export const HeroPanel = ({ children }: { children: React.ReactNode }) => {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                minHeight: '100px',
                background: '#E4E1EB',
                boxShadow: '0px 2px 0px white',
                borderRadius: 10,
                border: '2px #A8A2B5 solid',
                position: 'relative',
                padding: '52px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
            }}
        >
            <Rivet styles={{ top: 12, left: 16 }} />
            <Rivet styles={{ top: 12, right: 16 }} />
            <Rivet styles={{ bottom: 12, left: 16 }} />
            <Rivet styles={{ bottom: 12, right: 16 }} />
            {children}
        </div>
    );
};

export const HeroButton = ({
    onClick,
    children,
    disabled,
}: {
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}) => {
    return (
        <div
            style={{
                height: '100%',
                padding: 3,
                background: '#24202B',
                boxShadow: '0px 2px 0px white',
                borderRadius: 8,
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 2,
                display: 'inline-flex',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onClick={onClick}
        >
            <div
                style={{
                    paddingLeft: 16,
                    paddingRight: 16,
                    background: '#FB7001',
                    boxShadow: '0px 2px 0px rgba(255, 255, 255, 0.24) inset',
                    borderRadius: 5.5,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                    display: 'flex',
                }}
            >
                <div
                    style={{
                        width: 28,
                        height: 24,
                    }}
                >
                    <Image src={iconSparkles} alt="sparkles" />
                </div>
                <div
                    style={{
                        fontSize: 16,
                        fontFamily: 'Recursive',
                        fontWeight: '800',
                        letterSpacing: 0.8,
                        padding: '12px 8px',
                        wordWrap: 'break-word',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
