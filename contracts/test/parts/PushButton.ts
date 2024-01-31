import {
    loadFixture
} from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { expect } from 'chai';
import { deployDownstream, loadPartKindManifest } from '../helpers/parthelper';
import { ActionArgTypeEnumVal, PartKindSpec, parseManifestDocuments } from '../../../cli/src/utils/manifest';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

describe("PushButton", function() {

    const partKindSpec = loadPartKindManifest(path.join(__dirname, '../../src/parts/push-button.yaml'));

    it("should increment pressed count on click", async function () {
        const { newPartKind, walletClient } = await loadFixture(deployDownstream);

        const Part = await newPartKind(partKindSpec);

        const part = await Part.spawn([2, -2, 0]);

        const countBefore = await part.getState('pressed');
        await part.call('click', {player: walletClient.account.address});
        const countAfter = await part.getState('pressed');

        expect(countBefore).to.equal(0);
        expect(countAfter).to.equal(countBefore + 1);
    });


});
