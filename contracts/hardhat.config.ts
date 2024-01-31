import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-foundry";
import "hardhat-preprocessor";

const config: HardhatUserConfig = {
    solidity: "0.8.19",

    // hackery to let hardhat work with our remappings... kinda
    preprocess: {
        eachLine: (hre) => ({
            transform: (line: string) => {
                line = line.replace(/@ds\//g, 'src/');
                return line;
            },
        }),
    },
};

export default config;
