/**
 * This class represents a Vehicle that a provider lists on our platform.
 * It contains everything from the car model to the rental price per day.
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.Models
{
    [BsonIgnoreExtraElements]
    public class TransportVehicle
    {
        // Unique database ID for the vehicle listing
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } 

        // Link to the owner's account
        [BsonElement("ProviderId")]
        public string ProviderId { get; set; } = string.Empty; 

        // Public information about the owner (Name, Phone, etc.)
        [BsonElement("ProviderProfile")]
        public TransportProviderProfile ProviderProfile { get; set; } = new(); 

        // Vehicle Basic Info
        [BsonElement("Type")]
        public string Type { get; set; } = string.Empty;           // e.g. "Budget", "Luxury", "Standard"
        [BsonElement("VehicleClass")]
        public string VehicleClass { get; set; } = string.Empty;   // e.g. "Car", "Van", "Bus"
        [BsonElement("YearOfManufacture")]
        public int YearOfManufacture { get; set; }
        [BsonElement("SeatCount")]
        public int SeatCount { get; set; }                         // Maximum passengers allowed
        [BsonElement("IsAc")]
        public bool IsAc { get; set; }                             // Has Air Conditioning?
        [BsonElement("Transmission")]
        public string Transmission { get; set; } = string.Empty;   // "Automatic" or "Manual"
        [BsonElement("FuelType")]
        public string FuelType { get; set; } = string.Empty;       // "Petrol", "Diesel", etc.
        [BsonElement("ModelName")]
        public string ModelName { get; set; } = string.Empty;      // e.g. "Toyota Corolla"
        [BsonElement("Description")]
        public string Description { get; set; } = string.Empty;    // Extra text to attract customers

        // --- Pricing Settings ---
        [BsonElement("StandardDailyRate")]
        public decimal StandardDailyRate { get; set; }             // Cost per 1 day of hire
        [BsonElement("FreeKMLimit")]
        public int FreeKMLimit { get; set; }                       // KM allowed per day for free
        [BsonElement("ExtraKMRate")]
        public decimal ExtraKMRate { get; set; }                   // Cost per 1 extra KM
        [BsonElement("DriverNightOutFee")]
        public decimal DriverNightOutFee { get; set; }             // Extra fee if driver stays overnight away from home

        // --- Visuals (Images) ---
        [BsonElement("InteriorPhoto")]
        public string? InteriorPhoto { get; set; }                 // Photo of the seats/inside
        [BsonElement("ExteriorPhoto")]
        public string? ExteriorPhoto { get; set; }                 // Photo of the outside of the vehicle

        // --- Legal Documents (URLs to files) ---
        [BsonElement("DriverNicUrl")]
        public string? DriverNicUrl { get; set; }
        [BsonElement("DriverLicenseUrl")]
        public string? DriverLicenseUrl { get; set; }
        [BsonElement("InsuranceDocUrl")]
        public string? InsuranceDocUrl { get; set; }
        [BsonElement("InsuranceExpiry")]
        public string? InsuranceExpiry { get; set; }
        [BsonElement("RevenueLicenseUrl")]
        public string? RevenueLicenseUrl { get; set; }
        [BsonElement("RevenueLicenseExpiry")]
        public string? RevenueLicenseExpiry { get; set; }
        [BsonElement("RegistrationCertificateUrl")]
        public string? RegistrationCertificateUrl { get; set; }

        // Verification & Availability Status
        [BsonElement("AdminVerificationStatus")]
        public string AdminVerificationStatus { get; set; } = "Pending"; // "Pending", "Approved", or "Rejected"

        [BsonElement("IsAvailableForBooking")]
        public bool IsAvailableForBooking { get; set; } = false; // True if they want to accept bookings
        
        [BsonElement("CreatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Extra Amenities
        [BsonElement("Features")]
        public TransportVehicleFeatures Features { get; set; } = new(); 
        [BsonElement("Languages")]
        public List<string> Languages { get; set; } = new();       // Languages the driver speaks

        // Availability Calendar
        [BsonElement("AvailableDates")]
        public List<string> AvailableDates { get; set; } = new();
        [BsonElement("BookedDates")]
        public List<string> BookedDates { get; set; } = new();     // Dates when the vehicle is busy
        [BsonElement("MaintenanceDates")]
        public List<string> MaintenanceDates { get; set; } = new(); // Dates blocked for maintenance/personal use
        [BsonElement("BlockedDateRanges")]
        public List<BlockedDateRange> BlockedDateRanges { get; set; } = new(); // Structured blocked date ranges with reason

        // Customer Feedback
        [BsonElement("Reviews")]
        public List<TransportReview> Reviews { get; set; } = new(); 
    }

    /**
     * Information about the person or company that owns the vehicle.
     */
    [BsonIgnoreExtraElements]
    public class TransportProviderProfile
    {
        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;
        [BsonElement("phone")]
        public string Phone { get; set; } = string.Empty;
        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;
        [BsonElement("location")]
        public string Location { get; set; } = string.Empty;
    }

    /**
     * Special features/facilities inside the vehicle.
     */
    [BsonIgnoreExtraElements]
    public class TransportVehicleFeatures
    {
        [BsonElement("wifi")]
        public bool? Wifi { get; set; }
        [BsonElement("bluetooth")]
        public bool? Bluetooth { get; set; }
        [BsonElement("airbags")]
        public bool? Airbags { get; set; }
        [BsonElement("usbCharging")]
        public bool? UsbCharging { get; set; }
        [BsonElement("luggage")]
        public int Luggage { get; set; }        // Max luggage bags allowed
        [BsonElement("safety")]
        public bool Safety { get; set; }        // General safety equipment present
        [BsonElement("childSeats")]
        public bool? ChildSeats { get; set; }
        [BsonElement("entertainment")]
        public bool Entertainment { get; set; } // Music/Video system
        [BsonElement("tv")]
        public bool? Tv { get; set; }
    }

    /**
     * Customer review details.
     */
    [BsonIgnoreExtraElements]
    public class TransportReview
    {
        [BsonElement("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        [BsonElement("userName")]
        public string UserName { get; set; } = string.Empty;
        [BsonElement("userAvatar")]
        public string? UserAvatar { get; set; }
        [BsonElement("rating")]
        public int Rating { get; set; }         // 1 to 5 stars
        [BsonElement("comment")]
        public string Comment { get; set; } = string.Empty;
        [BsonElement("date")]
        public string Date { get; set; } = string.Empty;
    }

    /**
     * Blocked date range with optional reason for maintenance/personal use
     */
    [BsonIgnoreExtraElements]
    public class BlockedDateRange
    {
        [BsonElement("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [BsonElement("startDate")]
        public string StartDate { get; set; } = string.Empty; // Format: yyyy-MM-dd
        
        [BsonElement("endDate")]
        public string EndDate { get; set; } = string.Empty;   // Format: yyyy-MM-dd
        
        [BsonElement("reason")]
        public string Reason { get; set; } = string.Empty;    // Optional reason for blocking
        
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}