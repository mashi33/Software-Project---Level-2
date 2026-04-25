using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.API.Models
{
    public class TripHistory
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        // Reference to the Trip that was edited
        public string TripId { get; set; } = null!;
        public string EditedBy { get; set; } = null!;
        public DateTime EditedAt { get; set; }
        public string Changes { get; set; } = null!;
    }
}