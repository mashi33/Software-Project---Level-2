using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.API.Models
{
    public class TripItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string ActivityName { get; set; } = null!;
        public string ActivityTime { get; set; } = null!;
        public string Location { get; set; } = null!;
        public bool IsCompleted { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }

        // Add these two new lines below:
        public int DayNumber { get; set; } 
        public int OrderIndex { get; set; }
    }
}