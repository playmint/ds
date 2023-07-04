/** @format */

interface MaybeNamed {
    id: string;
    name?: {
        value?: string | null;
    } | null;
}

export const formatShortId = (id: string) => {
    return id.slice(-4);
};

export const formatNameOrId = (node?: MaybeNamed, idPrefix: string = ''): string => {
    if (!node) {
        return '';
    }
    return node.name?.value ? node.name.value : `${idPrefix}${formatShortId(node.id)}`;
};
