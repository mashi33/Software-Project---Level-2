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

        // Short bio or description about the user (default message provided)
        public string Bio { get; set; } = "Hey there! I am using Smart Journey Planner.";

        // URL of the user's profile picture
        public string ProfilePictureUrl { get; set; } = "";

        // User's location (city, country, etc.)
        public string Location { get; set; } = "";

        // List of user interests (e.g., hiking, beaches, food)
        public List<string> Interests { get; set; } = new List<string>();
        
        // --- PASSWORD MAPPING ---
        // Hashed password for security (never store plain text passwords)
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