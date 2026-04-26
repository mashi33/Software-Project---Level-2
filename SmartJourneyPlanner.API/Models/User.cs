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

        // User's full name
        public string FullName { get; set; } = string.Empty;

        // User's email address (used for login and communication)
        public string Email { get; set; } = string.Empty;

        // Hashed password for security
        public string PasswordHash { get; set; } = string.Empty;

        // This lets your code still use .Password if needed for legacy logic
        [BsonIgnore] 
        public string Password { get => PasswordHash; set => PasswordHash = value; }

        // Short bio or description about the user
        public string Bio { get; set; } = "Hey there! I am using Smart Journey Planner.";

        // URL of the user's profile picture
        public string ProfilePictureUrl { get; set; } = "";

        // User's location
        public string Location { get; set; } = "";

        // List of user interests
        public List<string> Interests { get; set; } = new List<string>();
        
        // Primary Role field: "Admin", "Provider", or "Traveller"
        public string UserType { get; set; } = "Traveller";

        // Allows you to use .Role in your Admin Panel logic while saving to UserType in DB
        [BsonIgnore]
        public string Role { get => UserType; set => UserType = value; }

        // ✅ User Status for Admin Management
        public string Status { get; set; } = "Approved"; 

        // ✅ FIXED: New property for Admin Block/Unblock functionality
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