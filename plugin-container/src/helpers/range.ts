/**
 * Construct a range with the lower and upper bounds provided.
 *
 * When calling `contains` on the range the lower and upper bounds
 * are inclusive
 *
 * @format
 * @param lower the lower bound of the range
 * @param upper the upper bound of the range
 * @returns A range object with the lower and upper bounds provided
 */

export function range(lower: number, upper: number) {
    return {
        lower,
        upper,
        contains: (value: number) => {
            return value >= lower && value <= upper;
        }
    };
}
