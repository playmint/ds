import {
    loadFixture
} from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { expect } from 'chai';
import { deployDownstream } from '../helpers/parthelper';
import { ActionArgTypeEnumVal } from '../../../cli/src/utils/manifest';


it("should trigger on remote state change", async function() {
    const { newPartKind, walletClient } = await loadFixture(deployDownstream);

    // Changer just increments state when 'change' action called
    const Changer = await newPartKind({
        name: 'Changer',
        model: 'clicky-button',
        actions: [
            { name: 'change' }
        ],
        state: [
            { name: 'count', type: 'int64' },
        ],
        logic: [
            {
                when: { kind: 'action', name: 'change' },
                do: [
                    {
                        kind: 'incstate',
                        name: 'count',
                    }
                ]
            }
        ]
    });

    // Watcher updates it's "watched" count to match the "count" state of the
    // connected Changer part
    const Watcher = await newPartKind({
        name: 'Watcher',
        model: 'clicky-button',
        parts: [
            { name: 'remote', kind: 'Changer' }
        ],
        state: [
            { name: 'watched', type: 'int64' },
        ],
        logic: [
            {
                when: { kind: 'state', part: 'remote', state: 'count' },
                do: [
                    {
                        kind: 'setstate',
                        name: 'watched',
                        value: {
                            kind: 'part',
                            part: 'remote',
                            name: 'count',
                        }
                    }
                ]
            }
        ]
    });

    const changer = await Changer.spawn([1, -3, 2]);
    const watcher = await Watcher.spawn([3, 2, -5]);

    // assign changer to the "remote" part slot on watcher
    await watcher.setPart('remote', changer.id());

    const countBefore = await watcher.getState('watched');
    await changer.call('change');
    await changer.call('change');
    await changer.call('change');
    const countAfter = await watcher.getState('watched');

    expect(countBefore).to.equal(0);
    expect(countAfter).to.equal(3);
});

it("should trigger when another part tells it to", async function() {
    const { newPartKind, walletClient } = await loadFixture(deployDownstream);

    // Teller will tell the Displayer, which it expects to be connected
    // at the scoreboard part variable, to update it's score by passing along the
    // number of times that the Teller has been clicked
    const Teller = await newPartKind({
        name: 'Teller',
        model: 'clicky-button',
        parts: [
            { name: 'scoreboard', kind: 'Displayer' }
        ],
        actions: [
            { name: 'click' }
        ],
        state: [
            { name: 'count', type: 'int64' },
        ],
        logic: [
            {
                when: { kind: 'action', name: 'click' },
                do: [
                    {
                        kind: 'incstate',
                        name: 'count',
                    },
                    {
                        kind: 'callaction',
                        name: 'update',
                        part: 'scoreboard',
                        args: [
                            {
                                kind: 'state',
                                name: 'count',
                            }
                        ]
                    }
                ]
            }
        ]
    });

    // Displayer has a score variable that another component can update
    // by calling it's `update` action and passing in the new score arg
    const Displayer = await newPartKind({
        name: 'Displayer',
        model: 'clicky-button',
        actions: [
            { name: 'update', args: [{ name: 'newScore', type: 'int64' }] }
        ],
        state: [
            { name: 'score', type: 'int64' },
        ],
        logic: [
            {
                when: { kind: 'action', name: 'update' },
                do: [
                    {
                        kind: 'setstate',
                        name: 'score',
                        value: {
                            kind: 'trigger',
                            name: 'newScore',
                        }
                    }
                ]
            }
        ]
    });

    const teller = await Teller.spawn([1, -3, 2]);
    const displayer = await Displayer.spawn([3, 2, -5]);

    // assign displayer to teller's scoreboard socket
    await teller.setPart('scoreboard', displayer.id());

    const countBefore = await displayer.getState('score');
    await teller.call('click');
    const countAfter = await displayer.getState('score');

    expect(countBefore).to.equal(0);
    expect(countAfter).to.equal(1);
});
