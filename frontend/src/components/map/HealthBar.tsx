import { colors } from '@app/styles/colors';
import React from 'react';

const HealthBar = ({ position, health }) => {
    // if (position) console.log(position.z - 6 / 10);
    return (
        <>
            <div
                style={{
                    display: `${position?.isVisible || false ? 'block' : 'none'}`,
                    position: `absolute`,
                    width: `calc(150px)`,
                    height: `calc(20px)`,
                    left: `calc(${position?.x || 0} * 100vw)`,
                    bottom: `calc(${position?.y || 0} * 100vh)`,
                    zIndex: '1',
                    marginLeft: `calc(-75px )`,
                    marginTop: `calc(-10px )`,
                    backgroundColor: colors.grey_1,
                    transform: `scale(calc(5/${position?.z || 0}))`,
                }}
            >
                <div style={{ width: `${health}%`, height: '100%', backgroundColor: colors.orange_0 }}></div>
            </div>
        </>
    );
};

export default HealthBar;
