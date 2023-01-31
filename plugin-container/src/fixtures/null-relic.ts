/** @format */

import { RelicMetadata, RelicModel } from '@app/types/relic-model';

export const nullRelicMetadata: RelicMetadata = {
    name: '',
    description: '',
    image: '',
    external_url: '',
    attributes: []
};

export const nullRelic: RelicModel = {
    tokenId: -1,
    relicType: '',
    material: '',
    pole: '',
    astral: '',
    element: '',
    alignment: '',
    greatness: -1,
    order: '',
    provenance: '',
    metadata: nullRelicMetadata
};
