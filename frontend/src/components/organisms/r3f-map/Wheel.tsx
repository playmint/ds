import { Selector } from '@app/../../core/dist/core';
import { FunctionComponent, useEffect, useState } from 'react';

const PROGRESS_UNIT = 0.01;
const PROGRESS_TIMEOUT = 1;

const getArcPath = (start: number, end: number, innerRadius: number, outerRadius: number): string => {
    const startAngle = start * Math.PI * 2;
    const endAngle = end * Math.PI * 2;
    const x1 = innerRadius * Math.sin(startAngle);
    const y1 = innerRadius * -Math.cos(startAngle);
    const x2 = outerRadius * Math.sin(startAngle);
    const y2 = outerRadius * -Math.cos(startAngle);
    const x3 = outerRadius * Math.sin(endAngle);
    const y3 = outerRadius * -Math.cos(endAngle);
    const x4 = innerRadius * Math.sin(endAngle);
    const y4 = innerRadius * -Math.cos(endAngle);
    const bigArc = end - start >= 0.5;
    const outerFlags = bigArc ? '1 1 1' : '0 0 1';
    const innerFlags = bigArc ? '1 1 0' : '1 0 0';
    return `M ${x1},${y1} L ${x2},${y2} A ${outerRadius} ${outerRadius} ${outerFlags} ${x3},${y3}
        L ${x4},${y4} A ${innerRadius} ${innerRadius} ${innerFlags} ${x1},${y1} Z`;
};

interface Intent {
    value: number; // how much of the wheel to take up
    intent: string; // label
}

interface WheelProps {
    width: number;
    height: number;
    // items: Intent[];
    innerRadius: number;
    outerRadius: number;
    intent?: string;
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[]>;
}

export const Wheel: FunctionComponent<WheelProps> = ({
    intent,
    selectIntent,
    selectTiles,
    width,
    height,
    innerRadius,
    outerRadius
}) => {
    const [visiblePart, setVisiblePart] = useState(0);

    useEffect(() => {
        if (visiblePart < 1) {
            setTimeout(() => setVisiblePart(visiblePart + PROGRESS_UNIT), PROGRESS_TIMEOUT);
        }
    }, [visiblePart]);

    const items: Intent[] = intent
        ? [
              { value: 100, intent: intent.toUpperCase() },
              { value: 100, intent: 'CANCEL' }
          ]
        : [
              { value: 100, intent: 'MOVE' },
              { value: 100, intent: 'CONSTRUCT' },
              { value: 100, intent: 'SCOUT' }
          ];

    const sum = items.reduce((sum, item) => sum + item.value, 0);
    let start = 0;
    const segments = items.map((item) => {
        const delta = (item.value / sum) * visiblePart;
        const path = getArcPath(start, start + delta, innerRadius, outerRadius);
        start += delta;
        return { ...item, path };
    });

    const handleClick = (intent: string) => {
        if (!selectIntent) {
            return;
        }
        if (intent == 'CANCEL') {
            selectIntent(undefined);
        } else {
            selectIntent(intent.toLowerCase());
        }
    };

    const fill =
        intent == 'construct' ? '#ff8c16' : intent == 'move' ? '#5ba067' : intent == 'scout' ? '#c51773' : '#143063cc';

    return (
        <svg width={width} height={height} style={{ position: 'relative', pointerEvents: 'none' }}>
            <g transform={`translate(${width / 2},${height / 2})`}>
                {segments.map((segment, idx) => [
                    <path
                        id={`s${idx}`}
                        key={`p${segment.intent}`}
                        stroke={'#ffffff'}
                        strokeWidth={1}
                        strokeOpacity={1}
                        fill={fill}
                        d={segment.path}
                    />,
                    <text
                        key={`t${segment.intent}`}
                        style={{
                            fontSize: '16px',
                            fontFamily: 'Roboto Condensed',
                            letterSpacing: '1px',
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                        }}
                        dy={20}
                        fill={'#fff'}
                        onClick={() => handleClick(segment.intent)}
                    >
                        <textPath xlinkHref={`#s${idx}`} startOffset="38%" spacing="auto" textAnchor="middle">
                            {segment.intent}
                        </textPath>
                    </text>
                ])}
            </g>
        </svg>
    );
};
