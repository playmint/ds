/** @format */

export const formatPlayerId = (id: string) => {
    return `${id.substr(0, 5)}...${id.substr(id.length - 4)}`;
};

export const formatSeekerKey = (id: string) => {
    return `${id.substr(0, 3)}...${id.substr(id.length - 3)}`;
};
