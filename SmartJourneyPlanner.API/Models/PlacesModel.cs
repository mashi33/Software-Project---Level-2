using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.Models
{
    public class Place
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string PlaceId { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Address { get; set; } = null!;
        public double Rating { get; set; }
        public int PriceLevel { get; set; }
        public string Category { get; set; } = null!;
        public string? PhotoReference { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int UserRatingsTotal { get; set; }
        public bool? IsOpenNow { get; set; }

        // Cache key = "cityname_category" e.g. "negombo_hotel"
        public string CacheKey { get; set; } = null!;

        // When this record was last refreshed from Google
        public DateTime LastFetched { get; set; }

        [BsonIgnore]
        public double DistanceFromUser { get; set; }
    }
}