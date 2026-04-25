using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.API.Models
{
    public class Trip
    {
        [BsonId]
        [BsonElement]
        [BsonRepresentation(BsonType.ObjectId)]

        // Unique identifier for the trip, represented as a MongoDB ObjectId 
        public string? Id { get; set; }
        public string TripName { get; set; } = null!;
        public string DepartFrom { get; set; } = null!;
        public string Destination { get; set; } = null!;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string BudgetLimit { get; set; } = string.Empty;
        public string? Description { get; set; }
        
        
        //invite many members
        public List<TripMember> Members { get; set; } = new List<TripMember>();
    }

    public class TripMember
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "Viewer"; // Editor හෝ Viewer
    }
}