using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.API.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        
        // "Admin", "Provider", or "Traveller"
        public string UserType { get; set; } = "Traveller"; 
        
        // "Pending", "Approved", or "Rejected"
        public string Status { get; set; } = "Approved"; 

        // --- Vehicle Details (Populated by Provider) ---
        [BsonIgnoreIfNull]
        public string? RegistrationNumber { get; set; }

        [BsonIgnoreIfNull]
        public string? VehicleModel { get; set; }

        [BsonIgnoreIfNull]
        public string? VehicleType { get; set; }

        [BsonIgnoreIfNull]
        public string? LicenseUrl { get; set; }

        [BsonIgnoreIfNull]
        public string? NicUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ✅ Prevents 400 errors if other team members add random fields to the DB
        [BsonExtraElements]
        public BsonDocument? CatchAll { get; set; }
    }
}