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
        [BsonElement]
        [BsonRepresentation(BsonType.ObjectId)]

        // Unique identifier for the trip, represented as a MongoDB ObjectId 
        public string? Id { get; set; }
        public string TripName { get; set; } = null!;
        public string DepartFrom { get; set; } = null!;
        public string Destination { get; set; } = null!;
        public DateTime StartDate { get; set; }  // Using Nullable DateTime (DateTime?) is safer in case some
        public DateTime EndDate { get; set; }    // documents in your database have missing or null dates.
        public string BudgetLimit { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DepartFrom { get; set; } = null!;
        
         // Invite many members to the trip
        public List<TripMember> Members { get; set; } = new List<TripMember>();
        public List<TripPlace> SavedPlaces { get; set; } = new List<TripPlace>();
        public string? CreatedBy { get; set; }
    }

    // Represents a member invited to the trip
    [BsonIgnoreExtraElements]
    public class TripMember
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "Viewer"; // Editor or Viewer
    }

    // Represents a specific location saved within a trip
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