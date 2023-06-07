/** @format */

export const formatPlayerId = (id: string) => {
    return `${id.substring(0, 5)}...${id.substring(id.length - 4)}`;
};

export const formatUnitKey = (id: string) => {
    return `${id.substring(0, 3)}...${id.substring(id.length - 3)}`;
};
