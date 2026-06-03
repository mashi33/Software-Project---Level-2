using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

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

        public string PasswordHash { get; set; } = string.Empty;

        [BsonIgnore] 
        public string Password { get => PasswordHash; set => PasswordHash = value; }

        public string Bio { get; set; } = "Hey there! I am using Smart Journey Planner.";

        public string ProfilePictureUrl { get; set; } = "";

        public string Location { get; set; } = "";

        public List<string> Interests { get; set; } = new List<string>();
        
        public string UserType { get; set; } = "Traveller";

        [BsonIgnore]
        public string Role { get => UserType; set => UserType = value; }

        public string Status { get; set; } = "Approved"; 

        public bool IsBlocked { get; set; } = false;

        // --- Vehicle Details (Optional for Providers) ---
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