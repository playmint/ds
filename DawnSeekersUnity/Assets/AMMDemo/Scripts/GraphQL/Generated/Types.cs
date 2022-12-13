using System.Collections.Generic;
using Newtonsoft.Json;

namespace AMMDemo.GraphQL.Generated {
  public class Types {
    
    #region Account
    public class Account {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
      #endregion
    }
    #endregion
    
    #region ActionBatch
    public class ActionBatch {
      #region members
      [JsonProperty("block")]
      public int? block { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("status")]
      public ActionTransactionStatus status { get; set; }
    
      [JsonProperty("transactions")]
      public List<ActionTransaction> transactions { get; set; }
    
      [JsonProperty("tx")]
      public string tx { get; set; }
      #endregion
    }
    #endregion
    
    #region ActionTransaction
    public class ActionTransaction {
      #region members
      [JsonProperty("batch")]
      public ActionBatch batch { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("owner")]
      public string owner { get; set; }
    
      [JsonProperty("payload")]
      public string payload { get; set; }
    
      [JsonProperty("router")]
      public Router router { get; set; }
    
      [JsonProperty("sig")]
      public string sig { get; set; }
    
      [JsonProperty("status")]
      public ActionTransactionStatus status { get; set; }
      #endregion
    }
    #endregion
    public enum ActionTransactionStatus {
      FAILED,
      PENDING,
      SUCCESS,
      UNKNOWN
    }
    
    
    #region Attribute
    public class Attribute {
      #region members
      [JsonProperty("kind")]
      public AttributeKind kind { get; set; }
    
      [JsonProperty("name")]
      public string name { get; set; }
    
      [JsonProperty("value")]
      public string value { get; set; }
      #endregion
    }
    #endregion
    public enum AttributeKind {
      ADDRESS,
      BOOL,
      BOOL_ARRAY,
      BYTES,
      BYTES_ARRAY,
      BYTES4,
      INT,
      INT_ARRAY,
      INT128,
      INT128_ARRAY,
      INT16,
      INT16_ARRAY,
      INT256,
      INT256_ARRAY,
      INT32,
      INT32_ARRAY,
      INT64,
      INT64_ARRAY,
      INT8,
      INT8_ARRAY,
      STRING,
      STRING_ARRAY,
      UINT128,
      UINT128_ARRAY,
      UINT16,
      UINT16_ARRAY,
      UINT256,
      UINT256_ARRAY,
      UINT32,
      UINT32_ARRAY,
      UINT64,
      UINT64_ARRAY,
      UINT8,
      UINT8_ARRAY
    }
    
    
    #region ContractConfig
    public class ContractConfig {
      #region members
      [JsonProperty("address")]
      public string address { get; set; }
    
      [JsonProperty("chainId")]
      public int chainId { get; set; }
    
      [JsonProperty("name")]
      public string name { get; set; }
      #endregion
    }
    #endregion
    
    #region Dispatcher
    public class Dispatcher {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
      #endregion
    }
    #endregion
    
    #region Edge
    public class Edge {
      #region members
      [JsonProperty("dir")]
      public EdgeDirection dir { get; set; }
    
      [JsonProperty("node")]
      public Node node { get; set; }
    
      [JsonProperty("rel")]
      public string rel { get; set; }
    
      [JsonProperty("weight")]
      public int weight { get; set; }
      #endregion
    }
    #endregion
    public enum EdgeDirection {
      BOTH,
      IN,
      OUT
    }
    
    
    #region EdgeType
    public class EdgeType {
      #region members
      [JsonProperty("edges")]
      public List<Edge> edges { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
      #endregion
    }
    #endregion
    
    #region ERC721Attribute
    public class ERC721Attribute {
      #region members
      [JsonProperty("display_type")]
      public string display_type { get; set; }
    
      [JsonProperty("trait_type")]
      public string trait_type { get; set; }
    
      [JsonProperty("value")]
      public string value { get; set; }
      #endregion
    }
    #endregion
    
    #region ERC721Metadata
    public class ERC721Metadata {
      #region members
      [JsonProperty("animation_url")]
      public string animation_url { get; set; }
    
      [JsonProperty("attributes")]
      public List<ERC721Attribute> attributes { get; set; }
    
      [JsonProperty("background_color")]
      public string background_color { get; set; }
    
      [JsonProperty("description")]
      public string description { get; set; }
    
      [JsonProperty("external_url")]
      public string external_url { get; set; }
    
      [JsonProperty("image")]
      public string image { get; set; }
    
      [JsonProperty("image_data")]
      public string image_data { get; set; }
    
      [JsonProperty("name")]
      public string name { get; set; }
    
      [JsonProperty("youtube_url")]
      public string youtube_url { get; set; }
      #endregion
    }
    #endregion
    
    #region Game
    public class Game {
      #region members
      [JsonProperty("dispatcher")]
      public Dispatcher dispatcher { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("name")]
      public string name { get; set; }
    
      [JsonProperty("router")]
      public Router router { get; set; }
    
      [JsonProperty("state")]
      public State state { get; set; }
      #endregion
    }
    #endregion
    
    #region Mutation
    public class Mutation {
      #region members
      [JsonProperty("dispatch")]
      public ActionTransaction dispatch { get; set; }
    
      [JsonProperty("signin")]
      public bool signin { get; set; }
    
      [JsonProperty("signout")]
      public bool signout { get; set; }
    
      [JsonProperty("signup")]
      public bool signup { get; set; }
      #endregion
    }
    #endregion
    
    #region Node
    public class Node {
      #region members
      [JsonProperty("attributeInt")]
      public int attributeInt { get; set; }
    
      [JsonProperty("attributes")]
      public List<Attribute> attributes { get; set; }
    
      [JsonProperty("attributeString")]
      public string attributeString { get; set; }
    
      [JsonProperty("edge")]
      public Edge edge { get; set; }
    
      [JsonProperty("edges")]
      public List<Edge> edges { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("node")]
      public Node node { get; set; }
    
      [JsonProperty("nodes")]
      public List<Node> nodes { get; set; }
      #endregion
    }
    #endregion
    
    #region NodeType
    public class NodeType {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("nodes")]
      public List<Node> nodes { get; set; }
      #endregion
    }
    #endregion
    
    #region Query
    public class Query {
      #region members
      [JsonProperty("game")]
      public Game game { get; set; }
    
      [JsonProperty("games")]
      public List<Game> games { get; set; }
      #endregion
    }
    #endregion
    
    #region Router
    public class Router {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("session")]
      public Session session { get; set; }
    
      [JsonProperty("sessions")]
      public List<Session> sessions { get; set; }
    
      [JsonProperty("transaction")]
      public ActionTransaction transaction { get; set; }
    
      [JsonProperty("transactions")]
      public List<ActionTransaction> transactions { get; set; }
      #endregion
    }
    #endregion
    
    #region Rule
    public class Rule {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
      #endregion
    }
    #endregion
    
    #region Session
    public class Session {
      #region members
      [JsonProperty("expires")]
      public int expires { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("owner")]
      public string owner { get; set; }
    
      [JsonProperty("scope")]
      public SessionScope scope { get; set; }
      #endregion
    }
    #endregion
    
    #region SessionScope
    public class SessionScope {
      #region members
      [JsonProperty("FullAccess")]
      public bool FullAccess { get; set; }
      #endregion
    }
    #endregion
    
    #region State
    public class State {
      #region members
      [JsonProperty("block")]
      public int block { get; set; }
    
      [JsonProperty("id")]
      public string id { get; set; }
    
      [JsonProperty("node")]
      public Node node { get; set; }
    
      [JsonProperty("nodes")]
      public List<Node> nodes { get; set; }
      #endregion
    }
    #endregion
    
    #region Subscription
    public class Subscription {
      #region members
      [JsonProperty("session")]
      public Session session { get; set; }
    
      [JsonProperty("state")]
      public State state { get; set; }
    
      [JsonProperty("transaction")]
      public ActionTransaction transaction { get; set; }
      #endregion
    }
    #endregion
  }
  
}
