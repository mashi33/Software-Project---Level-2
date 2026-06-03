/**
 * This class represents a single Trip Reservation (a "Booking") in our database.
 * It records all the details when a traveler hires a vehicle from a provider.
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.Models
{
    [BsonIgnoreExtraElements]
    public class TransportBooking
    {
        // Unique ID created by MongoDB for this specific booking
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } 

        // Linking IDs
        public string VehicleId { get; set; } = string.Empty;   // The vehicle that was chosen
        public string UserId { get; set; } = string.Empty;      // The traveler who made the booking
        public string ProviderId { get; set; } = string.Empty;  // The owner who provides the vehicle

        // Trip Dates
        public string StartDate { get; set; } = string.Empty;   // When the trip begins
        public string EndDate { get; set; } = string.Empty;     // When the trip ends

        // Duration & Cost
        public int Nights { get; set; }                         // Number of nights the driver stays out
        public int Days { get; set; }                           // Total number of days for the rental
        public decimal TotalAmount { get; set; }                // Final total price for the whole trip
        
        // Status & Metadata
        public string? ContactNumber { get; set; }              // Traveler's contact number
        public string Status { get; set; } = "Pending";         // State: Pending, Confirmed, Rejected, or Cancelled
        public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o"); // Exact time booking was made
        public bool? HasBeenRated { get; set; }                 // True if the user has already left a review


        // Specific Trip Requirements
        public string? PickupAddress { get; set; }              // Where the driver picks up the traveler
        public string? DestinationAddress { get; set; }         // The main destination
        public List<string>? Destinations { get; set; }         // Any extra stops along the way
        public int? PassengerCount { get; set; }                // How many people are traveling
        public int? LuggageCount { get; set; }                  // How many bags they have

        // Redundant helpers for quick UI display (saved at time of booking)
        public int? Passengers { get; set; }
        public string? Location { get; set; }
        public TransportPricingSummary? PricingSummary { get; set; } // Breakdown of the cost
        public string? VehicleImage { get; set; }
        public string? ProviderName { get; set; }
        public string? ProviderPhone { get; set; }
        public string? UserName { get; set; }
    }

    /**
     * Small object to show how the money is calculated.
     */
    public class TransportPricingSummary
    {
        public decimal DailyRate { get; set; }       // Charge for one day of driving
        public decimal DailyRental { get; set; }     // Total charge for all days
        public decimal NightlyRate { get; set; }     // Charge for one night of driver accommodation
        public decimal DriverNightOut { get; set; }  // Total charge for all nights
    }
}
