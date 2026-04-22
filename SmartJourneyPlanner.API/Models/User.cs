using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace smart_journey.backend.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;

        // UserType tracks if they are a "Traveler", "Provider", or "Admin"
        public string UserType { get; set; } = null!; 

        // Added for Admin Dashboard functionality
        public string Status { get; set; } = "Pending"; 
        
        // Added for Transport Provider specific details
        public string? RegistrationNumber { get; set; } 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}