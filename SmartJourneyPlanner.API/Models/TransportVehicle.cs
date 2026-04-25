using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.Models
{
    [BsonIgnoreExtraElements]
    public class TransportVehicle
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("ProviderId")]
        public string ProviderId { get; set; } = string.Empty;

        // ✅ Nested Object Mapping
        [BsonElement("ProviderProfile")]
        public TransportProviderProfile ProviderProfile { get; set; } = new();

        [BsonElement("Type")]
        public string Type { get; set; } = string.Empty; 

        [BsonElement("VehicleClass")]
        public string VehicleClass { get; set; } = string.Empty;

        [BsonElement("YearOfManufacture")]
        public int YearOfManufacture { get; set; }

        [BsonElement("SeatCount")]
        public int SeatCount { get; set; }

        [BsonElement("IsAc")]
        public bool IsAc { get; set; }

        [BsonElement("Transmission")]
        public string Transmission { get; set; } = string.Empty;

        [BsonElement("FuelType")]
        public string FuelType { get; set; } = string.Empty;

        [BsonElement("Description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("StandardDailyRate")]
        public decimal StandardDailyRate { get; set; }

        [BsonElement("FreeKMLimit")]
        public int FreeKMLimit { get; set; }

        [BsonElement("ExtraKMRate")]
        public decimal ExtraKMRate { get; set; }

        [BsonElement("DriverNightOutFee")]
        public decimal DriverNightOutFee { get; set; }

        // ✅ Photo & Document URLs (Mapped to exact Mongo Keys)
        [BsonElement("InteriorPhoto")]
        public string? InteriorPhoto { get; set; }

        [BsonElement("ExteriorPhoto")]
        public string? ExteriorPhoto { get; set; }

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
        public TransportVehicleFeatures Features { get; set; } = new();

        [BsonElement("Languages")]
        public List<string> Languages { get; set; } = new();

        [BsonElement("AvailableDates")]
        public List<string> AvailableDates { get; set; } = new();

        [BsonElement("BookedDates")]
        public List<string> BookedDates { get; set; } = new();

        [BsonElement("Reviews")]
        public List<TransportReview> Reviews { get; set; } = new();
    }

    public class TransportProviderProfile
    {
        [BsonElement("Name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("Phone")]
        public string Phone { get; set; } = string.Empty;

        [BsonElement("Location")]
        public string Location { get; set; } = string.Empty;
    }

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