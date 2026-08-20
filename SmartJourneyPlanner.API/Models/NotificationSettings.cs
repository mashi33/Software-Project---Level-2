using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements]
    public class NotificationSettings
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [BsonElement("userId")]
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("bookingRequests")]
        [JsonPropertyName("bookingRequests")]
        public bool BookingRequests { get; set; } = true;

        [BsonElement("cancellations")]
        [JsonPropertyName("cancellations")]
        public bool Cancellations { get; set; } = true;

        [BsonElement("vehicleApprovals")]
        [JsonPropertyName("vehicleApprovals")]
        public bool VehicleApprovals { get; set; } = true;

        [BsonElement("customerReviews")]
        [JsonPropertyName("customerReviews")]
        public bool CustomerReviews { get; set; } = true;

        [BsonElement("policyUpdates")]
        [JsonPropertyName("policyUpdates")]
        public bool PolicyUpdates { get; set; } = false;

        [BsonElement("bookingConfirmations")]
        [JsonPropertyName("bookingConfirmations")]
        public bool BookingConfirmations { get; set; } = true;

        [BsonElement("tripReminders")]
        [JsonPropertyName("tripReminders")]
        public bool TripReminders { get; set; } = true;

        [BsonElement("weatherAlerts")]
        [JsonPropertyName("weatherAlerts")]
        public bool WeatherAlerts { get; set; } = true;

        [BsonElement("budgetAlerts")]
        [JsonPropertyName("budgetAlerts")]
        public bool BudgetAlerts { get; set; } = true;

        [BsonElement("memoryPrompts")]
        [JsonPropertyName("memoryPrompts")]
        public bool MemoryPrompts { get; set; } = true;

        [BsonElement("emailAlerts")]
        [JsonPropertyName("emailAlerts")]
        public bool EmailAlerts { get; set; } = true;

        [BsonElement("pushAlerts")]
        [JsonPropertyName("pushAlerts")]
        public bool PushAlerts { get; set; } = true;
    }
}
