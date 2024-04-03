export const MAX_RANGE = 40;

export function isInBounds(q: number, r: number, s: number): boolean {
    const distance = max(Math.abs(q), max(Math.abs(r), Math.abs(s)));
    return distance <= MAX_RANGE;
}

function max(a: number, b: number): number {
    return a >= b ? a : b;
}