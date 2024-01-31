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
