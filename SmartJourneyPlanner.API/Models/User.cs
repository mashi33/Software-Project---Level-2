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

        // User's full name
        public string FullName { get; set; } = null!;

        // User's email address (used for login and communication)
        public string Email { get; set; } = null!;

        // Hashed password for security (never store plain text passwords)
        public string PasswordHash { get; set; } = null!;

        // Short bio or description about the user (default message provided)
        public string Bio { get; set; } = "Hey there! I am using Smart Journey Planner.";

        // URL of the user's profile picture
        public string ProfilePictureUrl { get; set; } = "";

        // User's location (city, country, etc.)
        public string Location { get; set; } = "";

        // List of user interests (e.g., hiking, beaches, food)
        public List<string> Interests { get; set; } = new List<string>();
        
        // "Admin", "Provider", or "Traveller"
        public string UserType { get; set; } = "Traveller"; 
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