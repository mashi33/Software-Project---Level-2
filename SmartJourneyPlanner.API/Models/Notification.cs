using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;
using System;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements]
    public class Notification
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [BsonElement("userId")]
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("icon")]
        [JsonPropertyName("icon")]
        public string Icon { get; set; } = string.Empty;

        [BsonElement("iconColorClass")]
        [JsonPropertyName("iconColorClass")]
        public string IconColorClass { get; set; } = string.Empty;

        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("time")]
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        [JsonPropertyName("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("isRead")]
        [JsonPropertyName("isRead")]
        public bool IsRead { get; set; }

        [BsonElement("linkText")]
        [JsonPropertyName("linkText")]
        public string LinkText { get; set; } = string.Empty;

        [BsonElement("route")]
        [JsonPropertyName("route")]
        public string Route { get; set; } = string.Empty;
    }
}
