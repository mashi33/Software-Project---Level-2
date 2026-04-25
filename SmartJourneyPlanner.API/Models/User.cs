using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements]
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        // --- PASSWORD MAPPING ---
        // We use PasswordHash to satisfy the AuthController
        public string PasswordHash { get; set; } = string.Empty;
        
        // This lets your code still use .Password if needed
        [BsonIgnore] 
        public string Password { get => PasswordHash; set => PasswordHash = value; }

        // --- ROLE / USERTYPE MAPPING ---
        // Your teammate uses UserType, you use Role. This handles BOTH.
        public string UserType { get; set; } = "Traveler";

        [BsonIgnore]
        public string Role { get => UserType; set => UserType = value; }

        public string Status { get; set; } = "Approved"; 

        // --- Vehicle Details ---
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
    }
}