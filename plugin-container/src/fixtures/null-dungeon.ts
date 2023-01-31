/** @format */
import { DungeonModel } from '@app/types/dungeon-model';

export const nullDungeon: DungeonModel = {
    id: -1,
    name: '',
    obstacles: [],
    raids: [],
    open: false,
    order: {
        suffix: ''
    }
};
