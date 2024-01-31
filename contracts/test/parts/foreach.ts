import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { deployDownstream, loadPartKindManifest } from "../helpers/parthelper";
import {
    ActionArgTypeEnumVal,
    PartKindSpec,
    parseManifestDocuments,
} from "../../../cli/src/utils/manifest";
import fs from "fs";
import path from "path";
import { z } from "zod";

describe("JimmyTest", function () {
    const partKindSpec: z.infer<typeof PartKindSpec> = {
        name: "foreachTest",
        model: "clicky-button",
        actions: [
            {
                name: "debug",
                args: [
                    {
                        name: "inputList",
                        type: "uint64",
                        list: true,
                        length: 4,
                    },
                ],
            },
        ],
        state: [
            {
                name: "list1",
                type: "uint64",
                list: true,
                length: 4,
            },
            {
                name: "list2",
                type: "uint64",
                list: true,
                length: 4,
            },
        ],
        logic: [
            {
                when: {
                    kind: "action",
                    name: "debug",
                },
                do: [
                    {
                        kind: "foreach",
                        label: "copy_to",
                        elements: {
                            kind: "trigger",
                            name: "inputList",
                        },
                        do: [
                            {
                                kind: "setstate",
                                name: "list1",
                                index: {
                                    kind: "loop",
                                    label: "copy_to",
                                    thing: "index",
                                },
                                value: {
                                    kind: "loop",
                                    label: "copy_to",
                                    thing: "value",
                                },
                            },
                        ],
                    },
                    {
                        kind: "foreach",
                        label: "copy_to",
                        elements: {
                            kind: "state",
                            name: "list1",
                        },
                        do: [
                            {
                                kind: "setstate",
                                name: "list2",
                                index: {
                                    kind: "loop",
                                    label: "copy_to",
                                    thing: "index",
                                },
                                value: {
                                    kind: "loop",
                                    label: "copy_to",
                                    thing: "value",
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    };

    it("input list expected to be copied to list 1", async function () {
        const { newPartKind, walletClient } =
            await loadFixture(deployDownstream);

        const Part = await newPartKind(partKindSpec);

        const part = await Part.spawn([2, -2, 0]);

        const inputList = [1, 2, 3, 4];

        const list1Before = [];
        for (let i = 0; i < inputList.length; i++) {
            const val = await part.getState("list1", i);
            list1Before.push(val);
        }

        await part.call("debug", { inputList });

        const list1After = [];
        for (let i = 0; i < inputList.length; i++) {
            const val = await part.getState("list1", i);
            list1After.push(val);
        }

        // Test each element
        for (let i = 0; i < inputList.length; i++) {
            expect(list1Before[i]).to.equal(0);
        }

        for (let i = 0; i < inputList.length; i++) {
            expect(list1After[i]).to.equal(inputList[i]);
        }
    });

    it("list 1 expected to be copied to list 2", async function () {
        const { newPartKind, walletClient } =
            await loadFixture(deployDownstream);

        const Part = await newPartKind(partKindSpec);

        const part = await Part.spawn([2, -2, 0]);

        const inputList = [1, 2, 3, 4];

        const list2Before = [];
        for (let i = 0; i < inputList.length; i++) {
            const val = await part.getState("list2", i);
            list2Before.push(val);
        }

        await part.call("debug", { inputList });

        const list1After = [];
        for (let i = 0; i < inputList.length; i++) {
            const val = await part.getState("list1", i);
            list1After.push(val);
        }

        const list2After = [];
        for (let i = 0; i < inputList.length; i++) {
            const val = await part.getState("list2", i);
            list2After.push(val);
        }

        // Test each element
        for (let i = 0; i < inputList.length; i++) {
            expect(list2Before[i]).to.equal(0);
        }

        for (let i = 0; i < inputList.length; i++) {
            expect(list2After[i]).to.equal(list1After[i]);
        }
    });
});
