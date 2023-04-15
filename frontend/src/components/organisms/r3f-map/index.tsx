import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './styles';
import { Canvas } from '@react-three/fiber';
import { Model as Tile } from './Tile';

export interface MapProps extends ComponentProps {}

const StyledMap = styled('div')`
    ${styles}
`;

export const R3FMap: FunctionComponent<MapProps> = ({ ...otherProps }) => {
    return (
        <StyledMap {...otherProps}>
            <Canvas>
                <mesh color="green">
                    <Tile>
                        <meshStandardMaterial />
                    </Tile>
                </mesh>
            </Canvas>
        </StyledMap>
    );
};
