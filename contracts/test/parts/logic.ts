import {
    loadFixture
} from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { expect } from 'chai';
import { deployDownstream } from '../helpers/parthelper';
import { ActionArgTypeEnumVal } from '../../../cli/src/utils/manifest';


it("should set a numeric state variable on click from action trigger arg", async function() {
    const { newPartKind, walletClient } = await loadFixture(deployDownstream);

    const ButtonKind = await newPartKind({
        name: 'Button',
        model: 'clicky-button',
        actions: [
            { name: 'click', args: [{name: 'newVal', type: 'int64'}] }
        ],
        state: [
            { name: 'clicked', type: 'uint64' },
        ],
        logic: [
            {
                when: { kind: 'action', name: 'click' },
                do: [
                    {
                        kind: 'setstate',
                        name: 'clicked',
                        value: { kind: 'trigger', name: 'newVal' }
                    }
                ]
            }
        ]
    });

    const button = await ButtonKind.spawn([2, -2, 0]);

    const valueBefore = await button.getState('clicked');
    await button.call('click', {newVal: -5});
    const valueAfter = await button.getState('clicked');

    expect(valueBefore).to.equal(0);
    expect(valueAfter).to.equal(-5);
});

it("should increment count by step on click", async function() {
    const { newPartKind, walletClient } = await loadFixture(deployDownstream);

    const ButtonKind = await newPartKind({
        name: 'Button',
        model: 'clicky-button',
        actions: [
            { name: 'click', args: [] }
        ],
        state: [
            { name: 'clicked', type: 'uint64' },
        ],
        logic: [
            {
                when: { kind: 'action', name: 'click' },
                do: [
                    {
                        kind: 'incstate',
                        name: 'clicked',
                        step: 3
                    }
                ]
            }
        ]
    });

    const button = await ButtonKind.spawn([2, -2, 0]);

    const countBefore = await button.getState('clicked');
    await button.call('click', {player: walletClient.account.address});
    const countAfter = await button.getState('clicked');

    expect(countBefore).to.equal(0);
    expect(countAfter).to.equal(countBefore + 3);
});


it("should decrement count by step on click", async function() {
    const { newPartKind, walletClient } = await loadFixture(deployDownstream);

    const ButtonKind = await newPartKind({
        name: 'Button',
        model: 'clicky-button',
        actions: [
            { name: 'click', args: [] }
        ],
        state: [
            { name: 'clicked', type: 'uint64' },
        ],
        logic: [
            {
                when: { kind: 'action', name: 'click' },
                do: [
                    {
                        kind: 'decstate',
                        name: 'clicked',
                        step: 4
                    }
                ]
            }
        ]
    });

    const button = await ButtonKind.spawn([2, -2, 0]);

    const countBefore = await button.getState('clicked');
    await button.call('click', {player: walletClient.account.address});
    const countAfter = await button.getState('clicked');

    expect(countBefore).to.equal(0);
    expect(countAfter).to.equal(countBefore - 4);
});
