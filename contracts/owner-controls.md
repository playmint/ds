# Game Owner Controls

### Set featured zone
`cast send --rpc-url <URL> --private-key <private-key> <contract-address> "setZoneIsFeatured(uint64,bool)" <zone-number> true`

### Remove featured zone
`cast send --rpc-url <URL> --private-key <private-key> <contract-address> "setZoneIsFeatured(uint64,bool)" <zone-number> false`

### Change maximum active units per zone
`cast send --rpc-url <URL> --private-key <private-key> <contract-address> "setZoneUnitLimit(uint64)" <number>`

### Change Unit time out blocks
`cast send --rpc-url <URL --private-key <private-key> <contract-address> "setUnitTimeoutBlocks(uint64)" <number-of-blocks>`

### Set Mint price
`cast send --rpc-url <URL> --ledger --mnemonic-index 0 <contract-address> "setMintPrice(uint256)" <mint-value>ether`
