using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.Models
{
    /// <summary>
    /// This class represents a Vehicle stored in the MongoDB database.
    /// It contains technical specs, pricing, and owner information.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class TransportVehicle
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } // Unique database ID

        [BsonElement("ProviderId")]
        public string ProviderId { get; set; } = string.Empty; // ID of the owner

        [BsonElement("ProviderProfile")]
        public TransportProviderProfile ProviderProfile { get; set; } = new(); // Owner details

        [BsonElement("Type")]
        public string Type { get; set; } = string.Empty; // e.g. Budget/Luxury

        [BsonElement("VehicleClass")]
        public string VehicleClass { get; set; } = string.Empty; // e.g. Car/Van/Bus

        [BsonElement("YearOfManufacture")]
        public int YearOfManufacture { get; set; }

        [BsonElement("SeatCount")]
        public int SeatCount { get; set; }

        [BsonElement("IsAc")]
        public bool IsAc { get; set; }

        [BsonElement("Transmission")]
        public string Transmission { get; set; } = string.Empty; // Automatic/Manual

        [BsonElement("FuelType")]
        public string FuelType { get; set; } = string.Empty;

        [BsonElement("ModelName")]
        public string ModelName { get; set; } = string.Empty;

        [BsonElement("Description")]
        public string Description { get; set; } = string.Empty;

        // Pricing logic
        [BsonElement("StandardDailyRate")]
        public decimal StandardDailyRate { get; set; }

        [BsonElement("FreeKMLimit")]
        public int FreeKMLimit { get; set; }

        [BsonElement("ExtraKMRate")]
        public decimal ExtraKMRate { get; set; }

        [BsonElement("DriverNightOutFee")]
        public decimal DriverNightOutFee { get; set; }

        // Stored images (Base64 strings)
        [BsonElement("InteriorPhoto")]
        public string? InteriorPhoto { get; set; }

        [BsonElement("ExteriorPhoto")]
        public string? ExteriorPhoto { get; set; }

        // Links to verification documents
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

        [BsonElement("IsVerified")]
        public bool IsVerified { get; set; } = false; // Admin flips this to true

        [BsonElement("Status")]
        public string Status { get; set; } = "Pending";

        [BsonElement("Features")]
        public TransportVehicleFeatures Features { get; set; } = new(); // Wi-Fi, Safety, etc.

        [BsonElement("Languages")]
        public List<string> Languages { get; set; } = new(); // Driver languages

        [BsonElement("AvailableDates")]
        public List<string> AvailableDates { get; set; } = new();

        [BsonElement("BookedDates")]
        public List<string> BookedDates { get; set; } = new(); // Calendar busy dates

        [BsonElement("Reviews")]
        public List<TransportReview> Reviews { get; set; } = new(); // Customer feedback
    }

    /// <summary>
    /// Details about the vehicle's owner.
    /// </summary>
    public class TransportProviderProfile
    {
        [BsonElement("Name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("Phone")]
        public string Phone { get; set; } = string.Empty;

        [BsonElement("Email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("Location")]
        public string Location { get; set; } = string.Empty;
    }

    /// <summary>
    /// Extra features available inside the vehicle.
    /// </summary>
    public class TransportVehicleFeatures
    {
        public bool? Wifi { get; set; }
        public bool? Bluetooth { get; set; }
        public bool? Airbags { get; set; }
        public bool? UsbCharging { get; set; }
        public int Luggage { get; set; }
        public bool Safety { get; set; }
        public bool? ChildSeats { get; set; }
        public bool Entertainment { get; set; }
        public bool? Tv { get; set; }
    }

    /// <summary>
    /// Feedback given by a traveler after a trip.
    /// </summary>
    public class TransportReview
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public int Rating { get; set; } // Stars (1-5)
        public string Comment { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
    }
}