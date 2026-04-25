using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.Models
{
    /// <summary>
    /// Model representing a booking for a transport vehicle
    /// </summary>
    [BsonIgnoreExtraElements]
    public class TransportBooking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string VehicleId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string ProviderId { get; set; } = string.Empty;

        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;

        public int Nights { get; set; }
        public int Days { get; set; }
        public decimal TotalAmount { get; set; }
        public string? ContactNumber { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Confirmed, Cancelled, Rejected, etc.
        public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
        public bool? HasBeenRated { get; set; }

        // Trip details
        public string? PickupAddress { get; set; }
        public string? DestinationAddress { get; set; }
        public List<string>? Destinations { get; set; }
        public int? PassengerCount { get; set; }
        public int? LuggageCount { get; set; }

        public int? Passengers { get; set; }
        public string? Location { get; set; }
        public TransportPricingSummary? PricingSummary { get; set; }
        public string? VehicleImage { get; set; }
        public string? ProviderName { get; set; }
        public string? ProviderPhone { get; set; }
        public string? UserName { get; set; }
    }

    /// <summary>
    /// Breakdown of the booking costs
    /// </summary>
    public class TransportPricingSummary
    {
        public decimal DailyRate { get; set; }
        public decimal DailyRental { get; set; }
        public decimal NightlyRate { get; set; }
        public decimal DriverNightOut { get; set; }
    }
}
