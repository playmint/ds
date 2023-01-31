/** @format */

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
    BigInt: any;
};

export type Account = {
    __typename?: 'Account';
    id: Scalars['ID'];
};

export type ActionBatch = {
    __typename?: 'ActionBatch';
    block?: Maybe<Scalars['Int']>;
    id: Scalars['ID'];
    status: ActionTransactionStatus;
    transactions: Array<ActionTransaction>;
    tx?: Maybe<Scalars['String']>;
};

export type ActionTransaction = {
    __typename?: 'ActionTransaction';
    batch: ActionBatch;
    id: Scalars['ID'];
    owner: Scalars['String'];
    payload: Scalars['String'];
    router: Router;
    sig: Scalars['String'];
    status: ActionTransactionStatus;
};

export enum ActionTransactionStatus {
    Failed = 'FAILED',
    Pending = 'PENDING',
    Success = 'SUCCESS',
    Unknown = 'UNKNOWN'
}

export enum AttributeKind {
    Address = 'ADDRESS',
    Bool = 'BOOL',
    BoolArray = 'BOOL_ARRAY',
    Bytes = 'BYTES',
    Bytes4 = 'BYTES4',
    BytesArray = 'BYTES_ARRAY',
    Int = 'INT',
    Int8 = 'INT8',
    Int8Array = 'INT8_ARRAY',
    Int16 = 'INT16',
    Int16Array = 'INT16_ARRAY',
    Int32 = 'INT32',
    Int32Array = 'INT32_ARRAY',
    Int64 = 'INT64',
    Int64Array = 'INT64_ARRAY',
    Int128 = 'INT128',
    Int128Array = 'INT128_ARRAY',
    Int256 = 'INT256',
    Int256Array = 'INT256_ARRAY',
    IntArray = 'INT_ARRAY',
    String = 'STRING',
    StringArray = 'STRING_ARRAY',
    Uint8 = 'UINT8',
    Uint8Array = 'UINT8_ARRAY',
    Uint16 = 'UINT16',
    Uint16Array = 'UINT16_ARRAY',
    Uint32 = 'UINT32',
    Uint32Array = 'UINT32_ARRAY',
    Uint64 = 'UINT64',
    Uint64Array = 'UINT64_ARRAY',
    Uint128 = 'UINT128',
    Uint128Array = 'UINT128_ARRAY',
    Uint256 = 'UINT256',
    Uint256Array = 'UINT256_ARRAY'
}

export type ContractConfig = {
    __typename?: 'ContractConfig';
    address: Scalars['String'];
    chainId: Scalars['Int'];
    name: Scalars['String'];
};

export type Dispatcher = {
    __typename?: 'Dispatcher';
    id: Scalars['ID'];
};

export type Erc721Attribute = {
    __typename?: 'ERC721Attribute';
    display_type: Scalars['String'];
    trait_type: Scalars['String'];
    value: Scalars['String'];
};

export type Erc721Metadata = {
    __typename?: 'ERC721Metadata';
    animation_url: Scalars['String'];
    attributes: Array<Erc721Attribute>;
    background_color: Scalars['String'];
    description: Scalars['String'];
    external_url: Scalars['String'];
    image: Scalars['String'];
    image_data: Scalars['String'];
    name: Scalars['String'];
    youtube_url: Scalars['String'];
};

/**
 * Represents a virtual visit of a node on the graph. True edges have a source
 * node and destination node. But when querying the graph, we may travel along
 * edges in any direction. Edge represents our position at a node along
 * with the edge that we followed.
 */
export type Edge = {
    __typename?: 'Edge';
    /**
     * `dir` indicates which "end" of the edge `node` is pointing to.
     * If we followed an outbound edge, then `dir` would be OUT and `node` would be referencing the node at the "destination" end of the edge.
     * If we followed an inbound edge, then `dir` would be IN and `node` would be referencing the node at the "source" end of the edge.
     */
    dir: RelMatchDirection;
    /**
     * `key` is the numeric key that uniquely identifies this edge from other edges
     * of the same `rel` type. It is a small uint8 number, but it is not necasarily
     * a sequential index. Many `rel` types do not allow for multiple outbound edges
     * of the same type, in which case this will be 0.
     */
    key: Scalars['Int'];
    /** the node on the `dir` end of this edge. */
    node: Node;
    /** rel is the human friendly name of the relationship. */
    rel: Scalars['String'];
    /** `weight` is the value stored in the edge */
    weight: Scalars['Int'];
};

export type Game = {
    __typename?: 'Game';
    dispatcher: Dispatcher;
    id: Scalars['ID'];
    name: Scalars['String'];
    router: Router;
    state: State;
};

/** match condition for traversing/filtering the graph. */
export type Match = {
    /**
     * has only matches nodes that directly have the Rel, similar to via but subtle difference.
     * given the graph...
     *
     * 	A --HAS_RED--> B --HAS_BLUE--> C
     * 	A --HAS_BLUE--> Y --HAS_RED--> Z
     *
     * match(via: ["HAS_RED", "HAS_BLUE"]) would return B,C,Y,Z
     * match(via: ["HAS_RED", "HAS_BLUE"], has: ["HAS_RED"]) would return B,Z
     */
    has?: InputMaybe<Array<RelMatch>>;
    /** ids only match if node is any of these ids, if empty match any id */
    ids?: InputMaybe<Array<Scalars['String']>>;
    /** kinds only matches if node kind is any of these kinds, if empty match any kind */
    kinds?: InputMaybe<Array<Scalars['String']>>;
    /** `limit` stops matches after that many edges have been collected */
    limit?: InputMaybe<Scalars['Int']>;
    /** via only follow edges of these rel types, if empty follow all edges */
    via?: InputMaybe<Array<RelMatch>>;
};

export type Mutation = {
    __typename?: 'Mutation';
    dispatch: ActionTransaction;
    signin: Scalars['Boolean'];
    signout: Scalars['Boolean'];
    signup: Scalars['Boolean'];
};

export type MutationDispatchArgs = {
    action: Scalars['String'];
    authorization: Scalars['String'];
    gameID: Scalars['ID'];
};

export type MutationSigninArgs = {
    authorization: Scalars['String'];
    gameID: Scalars['ID'];
    scope: Scalars['String'];
    session: Scalars['String'];
    ttl: Scalars['Int'];
};

export type MutationSignoutArgs = {
    authorization: Scalars['String'];
    gameID: Scalars['ID'];
    session: Scalars['String'];
};

export type MutationSignupArgs = {
    authorization: Scalars['String'];
    gameID: Scalars['ID'];
};

export type Node = {
    __typename?: 'Node';
    /**
     * `count` operates like `edges` but instead of returning the edges, it
     * returns the number of matched edges.
     */
    count: Scalars['Int'];
    /** same as `edges`, but only returns the first match */
    edge?: Maybe<Edge>;
    /**
     * fetch edges by traversing the graph from this node and applying the match
     * filter.
     */
    edges: Array<Edge>;
    /**
     * the full globally unique id of the node. see `splitID` for extracting
     * useful parts from the id.
     */
    id: Scalars['ID'];
    /**
     *    `key` is the same as `keys` but it assumes key is a single large value
     * as so is returned as a hex encoded string.
     */
    key?: Maybe<Scalars['BigInt']>;
    /**
     * the full id is made up of 4 bytes of "kind" + 8 bytes of user defined keys.
     * sometimes useful data is stored in the last 8 bytes, like maybe a smaller
     * identifier, or a timestamp, or multiple sub keys. keys extracts these little
     * subkeys from the big id. How many keys are extracted is ditacted by the
     * CompoundKeyKind value set on the state contract during registerNodeType
     */
    keys: Array<Scalars['BigInt']>;
    /**
     * nodes have a "kind" label, it is the human friendly decoding of the first 4
     * bytes of the id. See `id` and `keys`. This value is discovered based on the
     * value set on the state contract via registerNodeType.
     */
    kind: Scalars['String'];
    /** same as `nodes`, but only returns the first match */
    node?: Maybe<Node>;
    /**
     * fetch the DISTINCT nodes by traversing the graph from this node and applying the match
     * filter.
     */
    nodes: Array<Node>;
    /**
     * `sum` operates like `edges` but instead of returning the edges, it sums up
     * all the weights of the matched edges.
     */
    sum: Scalars['Int'];
    /**
     * `value` operates exactly as `edge` but instead of returning the Edge it
     * returns the weight value of that edge.
     */
    value?: Maybe<Scalars['Int']>;
};

export type NodeCountArgs = {
    match?: InputMaybe<Match>;
};

export type NodeEdgeArgs = {
    match?: InputMaybe<Match>;
};

export type NodeEdgesArgs = {
    match?: InputMaybe<Match>;
};

export type NodeNodeArgs = {
    match?: InputMaybe<Match>;
};

export type NodeNodesArgs = {
    match?: InputMaybe<Match>;
};

export type NodeSumArgs = {
    match?: InputMaybe<Match>;
};

export type NodeValueArgs = {
    match?: InputMaybe<Match>;
};

export type Query = {
    __typename?: 'Query';
    game: Game;
    games: Array<Game>;
};

export type QueryGameArgs = {
    id: Scalars['ID'];
};

/**
 * RelMatch configures the types of edges that can be matched.
 *
 * rel is the human friendly name of the relationship.
 *
 * dir is either IN/OUT/BOTH and ditactes if we consider the edge pointing in an
 * outbound or inbound direction from this node.
 */
export type RelMatch = {
    dir?: InputMaybe<RelMatchDirection>;
    rel: Scalars['String'];
};

/**
 * RelMatchDirection indicates a direction of the relationship to match.  Edges
 * are directional (they have a src node on one end and a dst node on the other)
 * Sometimes we want to traverse the graph following this direction, sometimes we
 * want to traverse in the oppersite direction, and sometimes it is purely the
 * fact that two nodes are connected that we care about.
 */
export enum RelMatchDirection {
    Both = 'BOTH',
    In = 'IN',
    Out = 'OUT'
}

export type Router = {
    __typename?: 'Router';
    id: Scalars['ID'];
    session?: Maybe<Session>;
    sessions: Array<Session>;
    transaction?: Maybe<ActionTransaction>;
    transactions: Array<ActionTransaction>;
};

export type RouterSessionArgs = {
    id: Scalars['ID'];
};

export type RouterSessionsArgs = {
    owner?: InputMaybe<Scalars['String']>;
};

export type RouterTransactionArgs = {
    id: Scalars['ID'];
};

export type RouterTransactionsArgs = {
    owner?: InputMaybe<Scalars['String']>;
    status?: InputMaybe<Array<ActionTransactionStatus>>;
};

export type Session = {
    __typename?: 'Session';
    expires: Scalars['Int'];
    id: Scalars['ID'];
    owner: Scalars['String'];
    scope: SessionScope;
};

export type SessionScope = {
    __typename?: 'SessionScope';
    FullAccess: Scalars['Boolean'];
};

export type State = {
    __typename?: 'State';
    block: Scalars['Int'];
    id: Scalars['ID'];
    /** node returns the first node that mates the Match filter. */
    node?: Maybe<Node>;
    /** nodes returns any nodes that match the Match filter. */
    nodes: Array<Node>;
};

export type StateNodeArgs = {
    match?: InputMaybe<Match>;
};

export type StateNodesArgs = {
    match?: InputMaybe<Match>;
};

export type Subscription = {
    __typename?: 'Subscription';
    session: Session;
    state?: Maybe<State>;
    transaction: ActionTransaction;
};

export type SubscriptionSessionArgs = {
    gameID: Scalars['ID'];
    owner?: InputMaybe<Scalars['String']>;
};

export type SubscriptionStateArgs = {
    gameID: Scalars['ID'];
};

export type SubscriptionTransactionArgs = {
    gameID: Scalars['ID'];
    owner?: InputMaybe<Scalars['String']>;
};

export type StateFragmentFragment = {
    __typename?: 'State';
    block: number;
    tiles: Array<{
        __typename?: 'Node';
        coords: Array<any>;
        biome?: number | null;
        seed?: { __typename?: 'Node'; key?: any | null } | null;
    }>;
    seekers: Array<{
        __typename?: 'Node';
        key?: any | null;
        cornBalance?: number | null;
        position?: { __typename?: 'Node'; coords: Array<any> } | null;
        player?: { __typename?: 'Node'; address?: any | null } | null;
    }>;
};

export type GetStateQueryVariables = Exact<{ [key: string]: never }>;

export type GetStateQuery = {
    __typename?: 'Query';
    game: {
        __typename?: 'Game';
        state: {
            __typename?: 'State';
            block: number;
            tiles: Array<{
                __typename?: 'Node';
                coords: Array<any>;
                biome?: number | null;
                seed?: { __typename?: 'Node'; key?: any | null } | null;
            }>;
            seekers: Array<{
                __typename?: 'Node';
                key?: any | null;
                cornBalance?: number | null;
                position?: { __typename?: 'Node'; coords: Array<any> } | null;
                player?: { __typename?: 'Node'; address?: any | null } | null;
            }>;
        };
    };
};

export type SigninMutationVariables = Exact<{
    gameID: Scalars['ID'];
    session: Scalars['String'];
    auth: Scalars['String'];
}>;

export type SigninMutation = { __typename?: 'Mutation'; signin: boolean };

export type DispatchMutationVariables = Exact<{
    gameID: Scalars['ID'];
    action: Scalars['String'];
    auth: Scalars['String'];
}>;

export type DispatchMutation = {
    __typename?: 'Mutation';
    dispatch: { __typename?: 'ActionTransaction'; id: string; status: ActionTransactionStatus };
};

export const StateFragmentFragmentDoc = gql`
    fragment stateFragment on State {
        block
        tiles: nodes(match: { kinds: ["Tile"] }) {
            coords: keys
            biome: value(match: { via: [{ rel: "Biome" }] })
            seed: node(match: { kinds: ["Seed"], via: [{ rel: "ProvidesEntropyTo", dir: IN }] }) {
                key
            }
        }
        seekers: nodes(match: { kinds: ["Seeker"] }) {
            key
            position: node(match: { kinds: ["Tile"], via: [{ rel: "Location" }] }) {
                coords: keys
            }
            player: node(match: { kinds: ["Player"], via: [{ rel: "Owner" }] }) {
                address: key
            }
            cornBalance: value(match: { via: [{ rel: "Balance" }] })
        }
    }
`;
export const GetStateDocument = gql`
    query GetState {
        game(id: "latest") {
            state {
                ...stateFragment
            }
        }
    }
    ${StateFragmentFragmentDoc}
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
export function useGetStateQuery(baseOptions?: Apollo.QueryHookOptions<GetStateQuery, GetStateQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery<GetStateQuery, GetStateQueryVariables>(GetStateDocument, options);
}
export function useGetStateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetStateQuery, GetStateQueryVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery<GetStateQuery, GetStateQueryVariables>(GetStateDocument, options);
}
export type GetStateQueryHookResult = ReturnType<typeof useGetStateQuery>;
export type GetStateLazyQueryHookResult = ReturnType<typeof useGetStateLazyQuery>;
export type GetStateQueryResult = Apollo.QueryResult<GetStateQuery, GetStateQueryVariables>;
export const SigninDocument = gql`
    mutation signin($gameID: ID!, $session: String!, $auth: String!) {
        signin(gameID: $gameID, session: $session, ttl: 9999, scope: "0xffffffff", authorization: $auth)
    }
`;
export type SigninMutationFn = Apollo.MutationFunction<SigninMutation, SigninMutationVariables>;

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
export function useSigninMutation(baseOptions?: Apollo.MutationHookOptions<SigninMutation, SigninMutationVariables>) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<SigninMutation, SigninMutationVariables>(SigninDocument, options);
}
export type SigninMutationHookResult = ReturnType<typeof useSigninMutation>;
export type SigninMutationResult = Apollo.MutationResult<SigninMutation>;
export type SigninMutationOptions = Apollo.BaseMutationOptions<SigninMutation, SigninMutationVariables>;
export const DispatchDocument = gql`
    mutation dispatch($gameID: ID!, $action: String!, $auth: String!) {
        dispatch(gameID: $gameID, action: $action, authorization: $auth) {
            id
            status
        }
    }
`;
export type DispatchMutationFn = Apollo.MutationFunction<DispatchMutation, DispatchMutationVariables>;

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
export function useDispatchMutation(
    baseOptions?: Apollo.MutationHookOptions<DispatchMutation, DispatchMutationVariables>
) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useMutation<DispatchMutation, DispatchMutationVariables>(DispatchDocument, options);
}
export type DispatchMutationHookResult = ReturnType<typeof useDispatchMutation>;
export type DispatchMutationResult = Apollo.MutationResult<DispatchMutation>;
export type DispatchMutationOptions = Apollo.BaseMutationOptions<DispatchMutation, DispatchMutationVariables>;
