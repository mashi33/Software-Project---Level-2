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

        [BsonElement("ProviderProfile")]
        public TransportProviderProfile ProviderProfile { get; set; } = new(); 

        // Vehicle Basic Info
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
        [BsonElement("ModelName")]
        public string ModelName { get; set; } = string.Empty;      
        [BsonElement("Description")]
        public string Description { get; set; } = string.Empty;    

        // Pricing Settings 
        [BsonElement("StandardDailyRate")]
        public decimal StandardDailyRate { get; set; }             
        [BsonElement("FreeKMLimit")]
        public int FreeKMLimit { get; set; }                       
        [BsonElement("ExtraKMRate")]
        public decimal ExtraKMRate { get; set; }                   
        [BsonElement("DriverNightOutFee")]
        public decimal DriverNightOutFee { get; set; }             


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
        [BsonElement("RegistrationCertificateUrl")]
        public string? RegistrationCertificateUrl { get; set; }

        // Verification & Availability Status
        [BsonElement("AdminVerificationStatus")]
        public string AdminVerificationStatus { get; set; } = "Pending"; 

        [BsonElement("IsAvailableForBooking")]
        public bool IsAvailableForBooking { get; set; } = false; 
        
        [BsonElement("CreatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        
        [BsonElement("Features")]
        public TransportVehicleFeatures Features { get; set; } = new(); 
        [BsonElement("Languages")]
        public List<string> Languages { get; set; } = new();       

        
        [BsonElement("AvailableDates")]
        public List<string> AvailableDates { get; set; } = new();
        [BsonElement("BookedDates")]
        public List<string> BookedDates { get; set; } = new();     
        [BsonElement("MaintenanceDates")]
        public List<string> MaintenanceDates { get; set; } = new(); 
        [BsonElement("BlockedDateRanges")]
        public List<BlockedDateRange> BlockedDateRanges { get; set; } = new(); 

        
        [BsonElement("Reviews")]
        public List<TransportReview> Reviews { get; set; } = new(); 
    }

    //Information about the person or company that owns the vehicle.
    [BsonIgnoreExtraElements] // preserve from crashes because of extra fields 
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
        public int Luggage { get; set; }          
        
        [BsonElement("safety")]
        public bool Safety { get; set; }        
        
        [BsonElement("childSeats")]
        public bool? ChildSeats { get; set; }
        
        [BsonElement("entertainment")]
        public bool Entertainment { get; set; } 
        
        [BsonElement("tv")]
        public bool? Tv { get; set; }
    }

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
        public int Rating { get; set; }         
        
        [BsonElement("comment")]
        public string Comment { get; set; } = string.Empty;
        
        [BsonElement("date")]
        public string Date { get; set; } = string.Empty;
    }

    /**
     * Blocked date range with optional reason for maintenance/personal use
     */
    public class BlockedDateRange
    {
        [BsonElement("Id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [BsonElement("StartDate")]
        public string StartDate { get; set; } = string.Empty; // Format: yyyy-MM-dd
        
        [BsonElement("EndDate")]
        public string EndDate { get; set; } = string.Empty;   // Format: yyyy-MM-dd
        
        [BsonElement("Reason")]
        public string Reason { get; set; } = string.Empty;    // Optional reason for blocking
        
        [BsonElement("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}