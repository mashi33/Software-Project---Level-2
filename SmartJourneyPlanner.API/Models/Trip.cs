using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System; 
using System.Collections.Generic;

namespace SmartJourneyPlanner.API.Models
{
    // Ignores extra fields in the MongoDB document that do not match the class properties
    [BsonIgnoreExtraElements] 
    public class Trip
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string TripName { get; set; } = null!;
        public string Destination { get; set; } = null!;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Description { get; set; }
        public string DepartFrom { get; set; } = null!;

        public List<TripMember> Members { get; set; } = new List<TripMember>();
        public List<TripPlace> SavedPlaces { get; set; } = new List<TripPlace>();
        public string? CreatedBy { get; set; }
    }

    /// <summary>
    /// Represents a member invited to the trip.
    /// </summary>
    public class TripMember
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "Viewer";
    }

    /// <summary>
    /// Represents a specific location saved within a trip.
    /// </summary>
    public class TripPlace
    {
        public string PlaceId { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Address { get; set; } = null!;
        public double Rating { get; set; }
        public string Category { get; set; } = null!;
        public string? PhotoReference { get; set; }
    }
}