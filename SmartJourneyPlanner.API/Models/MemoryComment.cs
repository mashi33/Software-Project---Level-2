using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models;

[BsonIgnoreExtraElements]
public class MemoryComment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [BsonElement("memoryId")]
    [JsonPropertyName("memoryId")]
    public string MemoryId { get; set; } = string.Empty;

    [BsonElement("userId")]
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("fullName")]
    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [BsonElement("text")]
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    [JsonPropertyName("createdAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}