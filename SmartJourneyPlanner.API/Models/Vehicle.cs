using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourney.Api.Models
{
    public class Vehicle
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string Name { get; set; } = string.Empty;
        
        public string Type { get; set; } = string.Empty;
        
        public bool Available { get; set; }
    }

    public class Booking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        
        public string VehicleId { get; set; } = string.Empty;
        
        public string Status { get; set; } = "Pending";
        
        public string BookingDate { get; set; } = string.Empty;
    }
}