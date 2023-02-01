/** @format */
import { ChapterId } from '@app/types/queries';

export enum ChapterSlug {
    ChapterOne = '/chapter-one',
    ChapterTwo = '/chapter-two',
    ChapterThree = '/chapter-three',
    ChapterFour = '/chapter-four'
}

export const currentChapter = ChapterSlug.ChapterThree;

export function getSlugForChapter(chapterId: ChapterId): ChapterSlug {
    switch (chapterId) {
        case ChapterId.One:
            return ChapterSlug.ChapterOne;
        case ChapterId.Two:
            return ChapterSlug.ChapterTwo;
        case ChapterId.Three:
            return ChapterSlug.ChapterThree;
        case ChapterId.Four:
            return ChapterSlug.ChapterFour;
        default:
            throw new Error('no slug for id');
    }
}
