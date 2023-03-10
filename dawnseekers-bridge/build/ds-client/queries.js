"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDispatchMutation = exports.DispatchDocument = exports.useSignoutMutation = exports.SignoutDocument = exports.useSigninMutation = exports.SigninDocument = exports.useOnStateSubscription = exports.OnStateDocument = exports.useGetStateLazyQuery = exports.useGetStateQuery = exports.GetStateDocument = exports.StateFragmentFragmentDoc = exports.RelMatchDirection = exports.AttributeKind = exports.ActionTransactionStatus = void 0;
const client_1 = require("@apollo/client");
const Apollo = __importStar(require("@apollo/client"));
const defaultOptions = {};
var ActionTransactionStatus;
(function (ActionTransactionStatus) {
    ActionTransactionStatus["Failed"] = "FAILED";
    ActionTransactionStatus["Pending"] = "PENDING";
    ActionTransactionStatus["Success"] = "SUCCESS";
    ActionTransactionStatus["Unknown"] = "UNKNOWN";
})(ActionTransactionStatus = exports.ActionTransactionStatus || (exports.ActionTransactionStatus = {}));
var AttributeKind;
(function (AttributeKind) {
    AttributeKind["Address"] = "ADDRESS";
    AttributeKind["Bool"] = "BOOL";
    AttributeKind["BoolArray"] = "BOOL_ARRAY";
    AttributeKind["Bytes"] = "BYTES";
    AttributeKind["Bytes4"] = "BYTES4";
    AttributeKind["BytesArray"] = "BYTES_ARRAY";
    AttributeKind["Int"] = "INT";
    AttributeKind["Int8"] = "INT8";
    AttributeKind["Int8Array"] = "INT8_ARRAY";
    AttributeKind["Int16"] = "INT16";
    AttributeKind["Int16Array"] = "INT16_ARRAY";
    AttributeKind["Int32"] = "INT32";
    AttributeKind["Int32Array"] = "INT32_ARRAY";
    AttributeKind["Int64"] = "INT64";
    AttributeKind["Int64Array"] = "INT64_ARRAY";
    AttributeKind["Int128"] = "INT128";
    AttributeKind["Int128Array"] = "INT128_ARRAY";
    AttributeKind["Int256"] = "INT256";
    AttributeKind["Int256Array"] = "INT256_ARRAY";
    AttributeKind["IntArray"] = "INT_ARRAY";
    AttributeKind["String"] = "STRING";
    AttributeKind["StringArray"] = "STRING_ARRAY";
    AttributeKind["Uint8"] = "UINT8";
    AttributeKind["Uint8Array"] = "UINT8_ARRAY";
    AttributeKind["Uint16"] = "UINT16";
    AttributeKind["Uint16Array"] = "UINT16_ARRAY";
    AttributeKind["Uint32"] = "UINT32";
    AttributeKind["Uint32Array"] = "UINT32_ARRAY";
    AttributeKind["Uint64"] = "UINT64";
    AttributeKind["Uint64Array"] = "UINT64_ARRAY";
    AttributeKind["Uint128"] = "UINT128";
    AttributeKind["Uint128Array"] = "UINT128_ARRAY";
    AttributeKind["Uint256"] = "UINT256";
    AttributeKind["Uint256Array"] = "UINT256_ARRAY";
})(AttributeKind = exports.AttributeKind || (exports.AttributeKind = {}));
/**
 * RelMatchDirection indicates a direction of the relationship to match.  Edges
 * are directional (they have a src node on one end and a dst node on the other)
 * Sometimes we want to traverse the graph following this direction, sometimes we
 * want to traverse in the oppersite direction, and sometimes it is purely the
 * fact that two nodes are connected that we care about.
 */
var RelMatchDirection;
(function (RelMatchDirection) {
    RelMatchDirection["Both"] = "BOTH";
    RelMatchDirection["In"] = "IN";
    RelMatchDirection["Out"] = "OUT";
})(RelMatchDirection = exports.RelMatchDirection || (exports.RelMatchDirection = {}));
exports.StateFragmentFragmentDoc = (0, client_1.gql) `
    fragment stateFragment on State {
        block
        players: nodes(match: { kinds: ["Player"] }) {
            id
            addr: key
        }
        resources: nodes(match: { kinds: ["Resource"] }) {
            id
        }
        bags: nodes(match: { kinds: ["Bag"] }) {
            id
            slots: edges(match: { kinds: ["Resource"], via: { rel: "Balance" } }) {
                key
                balance: weight
                resource: node {
                    id
                }
            }
        }
        seekers: nodes(match: { kinds: ["Seeker"] }) {
            id
            seekerID: key
            location: edges(match: { kinds: ["Tile"], via: [{ rel: "Location" }] }) {
                key
                time: weight
                tile: node {
                    id
                }
            }
            owner: node(match: { kinds: ["Player"], via: [{ rel: "Owner" }] }) {
                id
            }
            bags: edges(match: { kinds: ["Bag"], via: { rel: "Equip" } }) {
                key
                bag: node {
                    id
                }
            }
            wood: sum(
                match: {
                    ids: ["0x37f9b55d0000000000000000000000000000000000000001"]
                    via: [{ rel: "Equip" }, { rel: "Balance" }]
                }
            )
            owner: node(match: { kinds: ["Player"], via: [{ rel: "Owner" }] }) {
                id
            }
        }
        buildings: nodes(match: { kinds: ["Building"] }) {
            id
            location: edge(match: { kinds: ["Tile"], via: [{ rel: "Location" }] }) {
                tile: node {
                    id
                }
            }
            owner: node(match: { kinds: ["Player"], via: [{ rel: "Owner" }] }) {
                id
            }
            kind: node(match: { kinds: ["BuildingKind"], via: [{ rel: "Is" }] }) {
                id
            }
        }
        buildingKinds: nodes(match: { kinds: ["BuildingKind"] }) {
            id
            addr: key
        }
        tiles: nodes(match: { kinds: ["Tile"] }) {
            id
            coords: keys
            biome: value(match: { via: [{ rel: "Biome" }] })
            bags: edges(match: { kinds: ["Bag"], via: { rel: "Equip" } }) {
                key
                bag: node {
                    id
                }
            }
        }
    }
`;
exports.GetStateDocument = (0, client_1.gql) `
    query GetState {
        game(id: "DAWNSEEKERS") {
            state {
                ...stateFragment
            }
        }
        extensions: games {
            id
            name
            url
        }
    }
    ${exports.StateFragmentFragmentDoc}
`;
/**
 * __useGetStateQuery__
 *
 * To run a query within a React component, call `useGetStateQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStateQuery({
 *   variables: {
 *   },
 * });
 */
function useGetStateQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GetStateDocument, options);
}
exports.useGetStateQuery = useGetStateQuery;
function useGetStateLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GetStateDocument, options);
}
exports.useGetStateLazyQuery = useGetStateLazyQuery;
exports.OnStateDocument = (0, client_1.gql) `
    subscription OnState {
        state(gameID: "DAWNSEEKERS") {
            ...stateFragment
        }
    }
    ${exports.StateFragmentFragmentDoc}
`;
/**
 * __useOnStateSubscription__
 *
 * To run a query within a React component, call `useOnStateSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnStateSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnStateSubscription({
 *   variables: {
 *   },
 * });
 */
function useOnStateSubscription(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useSubscription(exports.OnStateDocument, options);
}
exports.useOnStateSubscription = useOnStateSubscription;
exports.SigninDocument = (0, client_1.gql) `
    mutation signin($gameID: ID!, $session: String!, $auth: String!) {
        signin(gameID: $gameID, session: $session, ttl: 9999, scope: "0xffffffff", authorization: $auth)
    }
`;
/**
 * __useSigninMutation__
 *
 * To run a mutation, you first call `useSigninMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSigninMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signinMutation, { data, loading, error }] = useSigninMutation({
 *   variables: {
 *      gameID: // value for 'gameID'
 *      session: // value for 'session'
 *      auth: // value for 'auth'
 *   },
 * });
 */
function useSigninMutation(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation(exports.SigninDocument, options);
}
exports.useSigninMutation = useSigninMutation;
exports.SignoutDocument = (0, client_1.gql) `
    mutation signout($gameID: ID!, $session: String!, $auth: String!) {
        signout(gameID: $gameID, session: $session, authorization: $auth)
    }
`;
/**
 * __useSignoutMutation__
 *
 * To run a mutation, you first call `useSignoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signoutMutation, { data, loading, error }] = useSignoutMutation({
 *   variables: {
 *      gameID: // value for 'gameID'
 *      session: // value for 'session'
 *      auth: // value for 'auth'
 *   },
 * });
 */
function useSignoutMutation(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation(exports.SignoutDocument, options);
}
exports.useSignoutMutation = useSignoutMutation;
exports.DispatchDocument = (0, client_1.gql) `
    mutation dispatch($gameID: ID!, $action: String!, $auth: String!) {
        dispatch(gameID: $gameID, action: $action, authorization: $auth) {
            id
            status
        }
    }
`;
/**
 * __useDispatchMutation__
 *
 * To run a mutation, you first call `useDispatchMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDispatchMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [dispatchMutation, { data, loading, error }] = useDispatchMutation({
 *   variables: {
 *      gameID: // value for 'gameID'
 *      action: // value for 'action'
 *      auth: // value for 'auth'
 *   },
 * });
 */
function useDispatchMutation(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation(exports.DispatchDocument, options);
}
exports.useDispatchMutation = useDispatchMutation;
