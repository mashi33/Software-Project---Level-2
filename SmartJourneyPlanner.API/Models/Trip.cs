using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;
using System; // ✅ Added for DateTime

namespace SmartJourneyPlanner.API.Models
{
    // ✅ CRITICAL: This tells MongoDB to ignore any fields in the database 
    // that are NOT defined in this C# class. This prevents 400 errors.
    [BsonIgnoreExtraElements]
    public class Trip
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string TripName { get; set; } = null!;
        public string Destination { get; set; } = null!;

        // ✅ Using Nullable DateTime (DateTime?) is safer in case some 
        // documents in your database have missing or null dates.
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public string? Description { get; set; }
        public string DepartFrom { get; set; } = null!;
        
        // invite many members
        public List<TripMember> Members { get; set; } = new List<TripMember>();
    }

    [BsonIgnoreExtraElements]
    public class TripMember
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "Viewer"; // Editor or Viewer
    }
}