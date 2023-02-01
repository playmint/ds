/** @format */
import { Fragment } from 'react';
import { RelicRewardModel } from '@app/types/relic-reward-model';
import { ChapterId } from '@app/types/queries';

export const chapterOneRelics: RelicRewardModel[] = [
    {
        material: 'Gold',
        relicType: 'Skull',
        rank: (
            <Fragment>
                <em>First</em> Conquered Dungeon Awards:
            </Fragment>
        ),
        imagePath: '/graphics/relics/gold-skull.jpg'
    },
    {
        material: 'Gold',
        relicType: 'Crown',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>2-3</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/gold-crown.jpg'
    },
    {
        material: 'Gold',
        relicType: 'Medal',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>4-8</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/gold-medal.jpg'
    },
    {
        material: 'Gold',
        relicType: 'Key',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>9-16</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/gold-key.jpg'
    }
];

export const chapterTwoRelics: RelicRewardModel[] = [
    {
        material: 'Ice',
        relicType: 'Key',
        rank: (
            <Fragment>
                <em>First</em> Conquered Dungeon Awards:
            </Fragment>
        ),
        imagePath: '/graphics/relics/ice-key.jpg'
    },
    {
        material: 'Ice',
        relicType: 'Dagger',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>2-3</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/ice-dagger.jpg'
    },
    {
        material: 'Ice',
        relicType: 'Gem',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>4-8</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/ice-gem.jpg'
    },
    {
        material: 'Ice',
        relicType: 'Coin',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>8-16</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/ice-coin.jpg'
    }
];

export const chapterThreeRelics: RelicRewardModel[] = [
    {
        material: 'Jade',
        relicType: 'Skull',
        rank: (
            <Fragment>
                <em>First</em> Conquered Dungeon Awards:
            </Fragment>
        ),
        imagePath: '/graphics/relics/jade-skull.jpg'
    },
    {
        material: 'Jade',
        relicType: 'Crown',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>2-3</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/jade-crown.jpg'
    },
    {
        material: 'Jade',
        relicType: 'Medal',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>4-7</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/jade-medal.jpg'
    },
    {
        material: 'Jade',
        relicType: 'Key',
        rank: (
            <Fragment>
                Conquered Dungeons <br />
                <em>8-15</em> Award:
            </Fragment>
        ),
        imagePath: '/graphics/relics/jade-key.jpg'
    },
    {
        material: 'Jade',
        relicType: 'Coin',
        rank: (
            <Fragment>
                Conquered Dungeon <br />
                <em>16</em> Awards:
            </Fragment>
        ),
        imagePath: '/graphics/relics/jade-coin.jpg'
    }
];

export function getRelicRewardsForChapter(chapterId: ChapterId): RelicRewardModel[] {
    switch (chapterId) {
        case ChapterId.One:
            return chapterOneRelics;
        case ChapterId.Two:
            return chapterTwoRelics;
        case ChapterId.Three:
            return chapterThreeRelics;
        default:
            throw new Error('no rewards set for chapter');
    }
}
