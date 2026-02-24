using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyBackend.Models
{
    public class TripItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string ActivityName { get; set; } = null!;
        public string ActivityTime { get; set; } = null!;
        public string Location { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string Category { get; set; } = "General";
        public bool IsCompleted { get; set; }
    }
}