using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using GraphQL;

namespace Cog.GraphQL.Generated {
  public class Types {

    #region Account
    public class Account {
      #region members
      [JsonProperty("address")]
      public string address { get; set; }

      [JsonProperty("id")]
      public string id { get; set; }

      [JsonProperty("metadata")]
      public ERC721Metadata metadata { get; set; }

      [JsonProperty("owner")]
      public Account owner { get; set; }

      [JsonProperty("seekers")]
      public List<Seeker> seekers { get; set; }

      [JsonProperty("sessions")]
      public List<Session> sessions { get; set; }
      #endregion
    }
    #endregion

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

    #region ERC721TransferEvent
    public class ERC721TransferEvent : Event {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
      #endregion
    }
    #endregion

    #region Ethereum
    public class Ethereum : Network {
      #region members
      [JsonProperty("blockNumber")]
      public int blockNumber { get; set; }

      [JsonProperty("id")]
      public NetworkId id { get; set; }
      #endregion
    }
    #endregion

    public interface Event {
      [JsonProperty("id")]
      public string id { get; set; }
    }

    #region Mutation
    public class Mutation {
      #region members
      [JsonProperty("mintSeeker")]
      public bool mintSeeker { get; set; }

      [JsonProperty("noop")]
      public bool noop { get; set; }

      [JsonProperty("signin")]
      public bool signin { get; set; }

      [JsonProperty("signup")]
      public bool signup { get; set; }
      #endregion
    }
    #endregion

    public interface Network {
      [JsonProperty("blockNumber")]
      public int blockNumber { get; set; }

      [JsonProperty("id")]
      public NetworkId id { get; set; }
    }
    public enum NetworkId {
      ETHEREUM,
      POLYGON
    }


    #region Polygon
    public class Polygon : Network {
      #region members
      [JsonProperty("blockNumber")]
      public int blockNumber { get; set; }

      [JsonProperty("id")]
      public NetworkId id { get; set; }
      #endregion
    }
    #endregion

    #region Query
    public class Query {
      #region members
      [JsonProperty("account")]
      public Account account { get; set; }

      [JsonProperty("accounts")]
      public List<Account> accounts { get; set; }

      [JsonProperty("contracts")]
      public List<ContractConfig> contracts { get; set; }

      [JsonProperty("networks")]
      public Network networks { get; set; }
      #endregion
    }
    #endregion

    #region Seeker
    public class Seeker {
      #region members
      [JsonProperty("id")]
      public int id { get; set; }

      [JsonProperty("metadata")]
      public ERC721Metadata metadata { get; set; }

      [JsonProperty("owner")]
      public Account owner { get; set; }
      #endregion
    }
    #endregion

    #region Session
    public class Session {
      #region members
      [JsonProperty("id")]
      public string id { get; set; }
      #endregion
    }
    #endregion

    #region Subscription
    public class Subscription {
      #region members
      [JsonProperty("events")]
      public Event events { get; set; }
      #endregion
    }
    #endregion
  }

}
