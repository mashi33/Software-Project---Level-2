using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.API.Models
{
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