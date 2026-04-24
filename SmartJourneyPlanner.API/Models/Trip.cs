using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.API.Models
{
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
        
        //invite many members
        public List<TripMember> Members { get; set; } = new List<TripMember>();
        // add hotels and restaurants
        public List<TripPlace> SavedPlaces { get; set; } = new List<TripPlace>();
        public string? CreatedBy { get; set; }
  }

    public class TripMember
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "Viewer"; // Editor හෝ Viewer
    }
      // saved hotels and restaurants on the trip
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
