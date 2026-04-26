using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.Models
{
    /// <summary>
    /// This class represents a Trip Reservation (Booking) in the MongoDB database.
    /// It links a traveler (User) with a vehicle owner (Provider).
    /// </summary>
    [BsonIgnoreExtraElements]
    public class TransportBooking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } // Unique database ID for the booking

        public string VehicleId { get; set; } = string.Empty; // Which vehicle was booked
        public string UserId { get; set; } = string.Empty; // Who booked it
        public string ProviderId { get; set; } = string.Empty; // Who owns the vehicle

        public string StartDate { get; set; } = string.Empty; // Trip start
        public string EndDate { get; set; } = string.Empty; // Trip end

        public int Nights { get; set; }
        public int Days { get; set; }
        public decimal TotalAmount { get; set; } // Final price to pay
        public string? ContactNumber { get; set; } // Traveler's phone
        public string Status { get; set; } = "Pending"; // Current state: Pending, Confirmed, etc.
        public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o"); // Timestamp
        public bool? HasBeenRated { get; set; } // If the user has submitted a review yet

        // Specific trip itinerary details
        public string? PickupAddress { get; set; }
        public string? DestinationAddress { get; set; }
        public List<string>? Destinations { get; set; } // List of stop-overs
        public int? PassengerCount { get; set; }
        public int? LuggageCount { get; set; }

        public int? Passengers { get; set; }
        public string? Location { get; set; }
        public TransportPricingSummary? PricingSummary { get; set; } // Detailed cost breakdown
        public string? VehicleImage { get; set; }
        public string? ProviderName { get; set; }
        public string? ProviderPhone { get; set; }
        public string? UserName { get; set; }
    }

    /// <summary>
    /// Explanation of how the total cost was calculated.
    /// </summary>
    public class TransportPricingSummary
    {
        public decimal DailyRate { get; set; } // Price per day
        public decimal DailyRental { get; set; } // Rate x Days
        public decimal NightlyRate { get; set; } // Driver stay fee per night
        public decimal DriverNightOut { get; set; } // Rate x Nights
    }
}
