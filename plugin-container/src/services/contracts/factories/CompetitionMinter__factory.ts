/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  CompetitionMinter,
  CompetitionMinterInterface,
} from "../CompetitionMinter";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract Relic",
        name: "relic",
        type: "address",
      },
      {
        internalType: "string",
        name: "imgBaseURL",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "competitionId",
        type: "uint16",
      },
      {
        internalType: "address",
        name: "claimer",
        type: "address",
      },
      {
        internalType: "bytes32[]",
        name: "proof",
        type: "bytes32[]",
      },
    ],
    name: "canClaim",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "competitionId",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "orderIndex",
        type: "uint16",
      },
      {
        internalType: "bytes32[]",
        name: "proof",
        type: "bytes32[]",
      },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes12",
        name: "",
        type: "bytes12",
      },
    ],
    name: "getAdditionalAttributes",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "competitionId",
        type: "uint16",
      },
    ],
    name: "getCompetition",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "nextTokenId",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "provenance",
            type: "string",
          },
          {
            internalType: "bool",
            name: "valid",
            type: "bool",
          },
        ],
        internalType: "struct CompetitionMinter.CompetitionInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getImageBaseURL",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes12",
        name: "data",
        type: "bytes12",
      },
    ],
    name: "getTokenOrderIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes12",
        name: "data",
        type: "bytes12",
      },
    ],
    name: "getTokenProvenance",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "imageBaseURL",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "competitionId",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "orderIndex",
        type: "uint16",
      },
    ],
    name: "packData",
    outputs: [
      {
        internalType: "bytes12",
        name: "",
        type: "bytes12",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "placeholderImageURL",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "competitionId",
        type: "uint16",
      },
      {
        internalType: "string",
        name: "provenance",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "startTokenId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "endTokenId",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "allowlistRoot",
        type: "bytes32",
      },
    ],
    name: "setCompetition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "newImageBaseURL",
        type: "string",
      },
    ],
    name: "setImageBaseURL",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes12",
        name: "data",
        type: "bytes12",
      },
    ],
    name: "unpackData",
    outputs: [
      {
        internalType: "uint16",
        name: "competitionId",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "orderIndex",
        type: "uint16",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b50604051620012f8380380620012f883398101604081905262000034916200016e565b6200003f3362000078565b600180546001600160a01b0319166001600160a01b03841617905580516200006f906003906020840190620000c8565b505050620002ba565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b828054620000d69062000267565b90600052602060002090601f016020900481019282620000fa576000855562000145565b82601f106200011557805160ff191683800117855562000145565b8280016001018555821562000145579182015b828111156200014557825182559160200191906001019062000128565b506200015392915062000157565b5090565b5b8082111562000153576000815560010162000158565b6000806040838503121562000181578182fd5b82516001600160a01b038116811462000198578283fd5b602084810151919350906001600160401b0380821115620001b7578384fd5b818601915086601f830112620001cb578384fd5b815181811115620001e057620001e0620002a4565b604051601f8201601f19908116603f011681019083821181831017156200020b576200020b620002a4565b81604052828152898684870101111562000223578687fd5b8693505b8284101562000246578484018601518185018701529285019262000227565b828411156200025757868684830101525b8096505050505050509250929050565b600181811c908216806200027c57607f821691505b602082108114156200029e57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b61102e80620002ca6000396000f3fe608060405234801561001057600080fd5b50600436106101005760003560e01c8063715018a611610097578063be36890711610066578063be3689071461024c578063c6f5c07c1461025f578063dba660dc14610282578063f2fde38b1461029557600080fd5b8063715018a6146101f557806382652651146101fd5780638da5cb5b146102295780639c9cac2f1461024457600080fd5b8063334b3d28116100d3578063334b3d28146101965780633b7afad2146101d25780633db66b4b146101e557806357f42510146101ed57600080fd5b806301194049146101055780630c8f55041461013d5780632abc55f614610152578063324bcbbf14610176575b600080fd5b610127610113366004610e8d565b505060408051602081019091526000815290565b6040516101349190610efa565b60405180910390f35b61015061014b366004610d14565b6102a8565b005b610168610160366004610e8d565b60f01c919050565b604051908152602001610134565b610189610184366004610d4f565b6102f2565b6040516101349190610f42565b6101b76101a4366004610cfa565b61ffff60e082901c169160f09190911c90565b6040805161ffff938416815292909116602083015201610134565b6101276101e0366004610e8d565b610427565b6101276104de565b61012761056c565b610150610653565b61021061020b366004610e2f565b610689565b6040516001600160a01b03199091168152602001610134565b6000546040516001600160a01b039091168152602001610134565b6101276106a7565b61015061025a366004610e61565b6106b4565b61027261026d366004610d69565b6107ef565b6040519015158152602001610134565b610150610290366004610dc8565b6108ff565b6101506102a3366004610cd9565b61096e565b6000546001600160a01b031633146102db5760405162461bcd60e51b81526004016102d290610f0d565b60405180910390fd5b80516102ee906003906020840190610b29565b5050565b610318604051806060016040528060008152602001606081526020016000151581525090565b61ffff821660009081526004602052604090206002015461035d5750506040805160608101825260008082528251602081810185528282528301529181019190915290565b6040805160608101825261ffff8416600081815260046020818152948220805485529290915283526003018054919283019161039890610f80565b80601f01602080910402602001604051908101604052809291908181526020018280546103c490610f80565b80156104115780601f106103e657610100808354040283529160200191610411565b820191906000526020600020905b8154815290600101906020018083116103f457829003601f168201915b5050509183525050600160209091015292915050565b61ffff60e082901c16600081815260046020526040902060030180546060929160f085901c9161045690610f80565b80601f016020809104026020016040519081016040528092919081815260200182805461048290610f80565b80156104cf5780601f106104a4576101008083540402835291602001916104cf565b820191906000526020600020905b8154815290600101906020018083116104b257829003601f168201915b50505050509250505092915050565b600380546104eb90610f80565b80601f016020809104026020016040519081016040528092919081815260200182805461051790610f80565b80156105645780601f1061053957610100808354040283529160200191610564565b820191906000526020600020905b81548152906001019060200180831161054757829003601f168201915b505050505081565b606060006003805461057d90610f80565b9050116105c35760405162461bcd60e51b81526020600482015260146024820152731a5b5859d950985cd9555493081b9bdd081cd95d60621b60448201526064016102d2565b600380546105d090610f80565b80601f01602080910402602001604051908101604052809291908181526020018280546105fc90610f80565b80156106495780601f1061061e57610100808354040283529160200191610649565b820191906000526020600020905b81548152906001019060200180831161062c57829003601f168201915b5050505050905090565b6000546001600160a01b0316331461067d5760405162461bcd60e51b81526004016102d290610f0d565b6106876000610a09565b565b60f01b6001600160f01b03191660e09190911b61ffff60e01b161790565b600280546104eb90610f80565b6106c0843384846107ef565b6107005760405162461bcd60e51b81526020600482015260116024820152706e6f742061626c6520746f20636c61696d60781b60448201526064016102d2565b61ffff8416600090815260046020818152604080842033855290920190528120805460ff191660011790556107358585610689565b60015461ffff8716600090815260046020819052604091829020549151630ec7bebb60e31b8152339181019190915260248101919091526001600160a01b0319831660448201529192506001600160a01b03169063763df5d890606401600060405180830381600087803b1580156107ac57600080fd5b505af11580156107c0573d6000803e3d6000fd5b5050505061ffff851660009081526004602052604081208054916107e383610fbb565b91905055505050505050565b6040516bffffffffffffffffffffffff19606085901b166020820152600090819060340160408051601f19818403018152918152815160209283012061ffff8916600090815260048085528382206001600160a01b038b1683520190935291205490915060ff16158015610878575061ffff861660009081526004602052604090206002015415155b801561089c575061ffff861660009081526004602052604090206001810154905411155b80156108f557506108f5848480806020026020016040519081016040528093929190818152602001838360200280828437600092018290525061ffff8c168152600460205260409020600201549250859150610a599050565b9695505050505050565b6000546001600160a01b031633146109295760405162461bcd60e51b81526004016102d290610f0d565b61ffff85166000908152600460209081526040909120848155600181018490556002810183905585519091610965916003840191880190610b29565b50505050505050565b6000546001600160a01b031633146109985760405162461bcd60e51b81526004016102d290610f0d565b6001600160a01b0381166109fd5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b60648201526084016102d2565b610a0681610a09565b50565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b600082610a668584610a6f565b14949350505050565b600081815b8451811015610b21576000858281518110610a9f57634e487b7160e01b600052603260045260246000fd5b60200260200101519050808311610ae1576040805160208101859052908101829052606001604051602081830303815290604052805190602001209250610b0e565b60408051602081018390529081018490526060016040516020818303038152906040528051906020012092505b5080610b1981610fbb565b915050610a74565b509392505050565b828054610b3590610f80565b90600052602060002090601f016020900481019282610b575760008555610b9d565b82601f10610b7057805160ff1916838001178555610b9d565b82800160010185558215610b9d579182015b82811115610b9d578251825591602001919060010190610b82565b50610ba9929150610bad565b5090565b5b80821115610ba95760008155600101610bae565b80356001600160a01b0381168114610bd957600080fd5b919050565b60008083601f840112610bef578081fd5b50813567ffffffffffffffff811115610c06578182fd5b6020830191508360208260051b8501011115610c2157600080fd5b9250929050565b80356001600160a01b031981168114610bd957600080fd5b600082601f830112610c50578081fd5b813567ffffffffffffffff80821115610c6b57610c6b610fe2565b604051601f8301601f19908116603f01168101908282118183101715610c9357610c93610fe2565b81604052838152866020858801011115610cab578485fd5b8360208701602083013792830160200193909352509392505050565b803561ffff81168114610bd957600080fd5b600060208284031215610cea578081fd5b610cf382610bc2565b9392505050565b600060208284031215610d0b578081fd5b610cf382610c28565b600060208284031215610d25578081fd5b813567ffffffffffffffff811115610d3b578182fd5b610d4784828501610c40565b949350505050565b600060208284031215610d60578081fd5b610cf382610cc7565b60008060008060608587031215610d7e578283fd5b610d8785610cc7565b9350610d9560208601610bc2565b9250604085013567ffffffffffffffff811115610db0578283fd5b610dbc87828801610bde565b95989497509550505050565b600080600080600060a08688031215610ddf578081fd5b610de886610cc7565b9450602086013567ffffffffffffffff811115610e03578182fd5b610e0f88828901610c40565b959895975050505060408401359360608101359360809091013592509050565b60008060408385031215610e41578182fd5b610e4a83610cc7565b9150610e5860208401610cc7565b90509250929050565b60008060008060608587031215610e76578384fd5b610e7f85610cc7565b9350610d9560208601610cc7565b60008060408385031215610e9f578182fd5b82359150610e5860208401610c28565b60008151808452815b81811015610ed457602081850181015186830182015201610eb8565b81811115610ee55782602083870101525b50601f01601f19169290920160200192915050565b602081526000610cf36020830184610eaf565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b60208152815160208201526000602083015160606040840152610f686080840182610eaf565b90506040840151151560608401528091505092915050565b600181811c90821680610f9457607f821691505b60208210811415610fb557634e487b7160e01b600052602260045260246000fd5b50919050565b6000600019821415610fdb57634e487b7160e01b81526011600452602481fd5b5060010190565b634e487b7160e01b600052604160045260246000fdfea2646970667358221220811426c6d2aadc8902a9d9db60c5b3e497cd6f6bc3c1139c6e81679ec2eafee064736f6c63430008040033";

type CompetitionMinterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: CompetitionMinterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class CompetitionMinter__factory extends ContractFactory {
  constructor(...args: CompetitionMinterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  deploy(
    relic: string,
    imgBaseURL: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<CompetitionMinter> {
    return super.deploy(
      relic,
      imgBaseURL,
      overrides || {}
    ) as Promise<CompetitionMinter>;
  }
  getDeployTransaction(
    relic: string,
    imgBaseURL: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(relic, imgBaseURL, overrides || {});
  }
  attach(address: string): CompetitionMinter {
    return super.attach(address) as CompetitionMinter;
  }
  connect(signer: Signer): CompetitionMinter__factory {
    return super.connect(signer) as CompetitionMinter__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): CompetitionMinterInterface {
    return new utils.Interface(_abi) as CompetitionMinterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): CompetitionMinter {
    return new Contract(address, _abi, signerOrProvider) as CompetitionMinter;
  }
}
