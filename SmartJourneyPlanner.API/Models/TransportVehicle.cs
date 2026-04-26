using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.Models
{
    /// <summary>
    /// Model representing a transport vehicle
    /// </summary>
    [BsonIgnoreExtraElements]
    public class TransportVehicle
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string ProviderId { get; set; } = string.Empty;

        public TransportProviderProfile ProviderProfile { get; set; } = new();

        public string Type { get; set; } = string.Empty; // e.g. Budget, Luxury, Group
        public string VehicleClass { get; set; } = string.Empty; // e.g. Car, Van, Bus
        public int YearOfManufacture { get; set; }
        public int SeatCount { get; set; }
        public bool IsAc { get; set; }
        public string Transmission { get; set; } = string.Empty;
        public string FuelType { get; set; } = string.Empty;
        public string ModelName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public decimal StandardDailyRate { get; set; }
        public int FreeKMLimit { get; set; }
        public decimal ExtraKMRate { get; set; }
        public decimal DriverNightOutFee { get; set; }

        public string? InteriorPhoto { get; set; }
        public string? ExteriorPhoto { get; set; }

        // URLs for driver and vehicle documents
        public string? DriverNicUrl { get; set; }
        public string? DriverLicenseUrl { get; set; }
        public string? InsuranceDocUrl { get; set; }
        public string? InsuranceExpiry { get; set; }
        public string? RevenueLicenseUrl { get; set; }
        public string? RevenueLicenseExpiry { get; set; }

        public bool IsVerified { get; set; }
        public string Status { get; set; } = "Pending";

        public TransportVehicleFeatures Features { get; set; } = new();

        public List<string> Languages { get; set; } = new();

        public List<string> AvailableDates { get; set; } = new();
        public List<string> BookedDates { get; set; } = new();

        public List<TransportReview> Reviews { get; set; } = new();
    }

    /// <summary>
    /// Information about the transport service provider
    /// </summary>
    public class TransportProviderProfile
    {
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }

    /// <summary>
    /// Specific features available in the vehicle
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
    /// Customer review for a vehicle
    /// </summary>
    public class TransportReview
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
    }
}
