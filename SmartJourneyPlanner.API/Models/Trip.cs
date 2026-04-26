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
        // Unique identifier for the trip
        public string? Id { get; set; }

        public string TripName { get; set; } = null!;

        // ✅ FIXED: Removed the duplicate definition of DepartFrom below
        public string DepartFrom { get; set; } = null!;

        public string Destination { get; set; } = null!;

        // Using DateTime (Ensure your Angular frontend sends ISO strings)
        public DateTime StartDate { get; set; }  
        
        public DateTime EndDate { get; set; }    

        public string BudgetLimit { get; set; } = string.Empty;

        public string? Description { get; set; }
        
        // Invite many members to the trip
        public List<TripMember> Members { get; set; } = new List<TripMember>();

        public List<TripPlace> SavedPlaces { get; set; } = new List<TripPlace>();

        // Tracks which user created the trip
        public string? CreatedBy { get; set; }
    }

    // Represents a member invited to the trip
    [BsonIgnoreExtraElements]
    public class TripMember
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "Viewer"; // "Editor" or "Viewer"
    }

    // Represents a specific location saved within a trip
    [BsonIgnoreExtraElements]
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