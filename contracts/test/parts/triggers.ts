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
            { name: 'count', type: 'uint64' },
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

    // Watcher updates it's "watched" count each time the "remote" Changer
    // part updates it's state
    const Watcher = await newPartKind({
        name: 'Watcher',
        model: 'clicky-button',
        parts: [
            { name: 'remote', kind: 'Changer' }
        ],
        state: [
            { name: 'watched', type: 'uint64' },
        ],
        logic: [
            {
                when: { kind: 'state', part: 'remote', state: 'count' },
                do: [
                    {
                        kind: 'incstate',
                        name: 'watched',
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
