using System.Collections.Generic;
using Newtonsoft.Json;

namespace Cog.GraphQL
{
    #region FetchStateQuery
    public class FetchStateQuery
    {
        #region members
        [JsonProperty("game")]
        public Game Game { get; set; }
        #endregion
    }
    #endregion

    #region FetchStateQuery
    public class OnStateSubscription
    {
        #region members
        [JsonProperty("state")]
        public State State { get; set; }
        #endregion
    }
    #endregion

    #region Game
    public class Game
    {
        #region members
        // [JsonProperty("id")]
        // public string ID { get; set; }
        [JsonProperty("state")]
        public State State { get; set; }
        #endregion
    }
    #endregion

    #region State
    public class State
    {
        #region members
        [JsonProperty("block")]
        public uint Block { get; set; }

        [JsonProperty("tiles")]
        public List<Tile> Tiles { get; set; }

        [JsonProperty("seekers")]
        public List<Seeker> Seekers { get; set; }
        #endregion
    }
    #endregion

    public class Tile
    {
        #region members
        [JsonProperty("coords")]
        public List<string> Coords { get; set; }

        [JsonProperty("biome", NullValueHandling = NullValueHandling.Ignore)]
        public Biome? Biome { get; set; }

        [JsonProperty("bags")]
        public List<Bag> Bags { get; set; }
        #endregion
    }

    public class Bag
    {
        #region members
        [JsonProperty("id")]
        public string ID { get; set; }

        [JsonProperty("slots")]
        public List<Slot> Slots { get; set; }
        #endregion
    }

    public class Slot
    {
        #region members
        [JsonProperty("slot")]
        public uint SlotKey { get; set; }

        [JsonProperty("balance")]
        public uint Balance { get; set; }

        [JsonProperty("resource")]
        public Resource Resource { get; set; }
        #endregion
    }

    public class Resource
    {
        #region members
        [JsonProperty("id")]
        public string ID { get; set; }
        #endregion
    }

    public class Seeker
    {
        #region members
        [JsonProperty("seekerID")]
        public string SeekerID { get; set; }

        [JsonProperty("location")]
        public List<Location> Location { get; set; }
        #endregion
    }

    public class Location
    {
        #region members
        [JsonProperty("time")]
        public int Time { get; set; }

        [JsonProperty("tile")]
        public Tile Tile { get; set; }
        #endregion
    }

    public enum Biome
    {
        UNDISCOVERED,
        DISCOVERED
    }
}
