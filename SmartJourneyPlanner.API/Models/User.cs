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

        
        public string UserType { get; set; } = null!; 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}