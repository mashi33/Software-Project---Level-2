using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models;

[BsonIgnoreExtraElements] 
public class TripMemory
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("id")] // Ensures Angular sees 'id' not 'Id'
    public string? Id { get; set; }

    [BsonElement("title")]
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("locationName")]
    [JsonPropertyName("locationName")]
    public string LocationName { get; set; } = string.Empty;

    [BsonElement("imageUrl")]
    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;

    [BsonElement("latitude")]
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [BsonElement("longitude")]
    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }

    [BsonElement("startDate")]
    [JsonPropertyName("startDate")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime StartDate { get; set; } = DateTime.UtcNow;

    [BsonElement("endDate")]
    [JsonPropertyName("endDate")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime EndDate { get; set; } = DateTime.UtcNow;
    
    [BsonElement("createdAt")]
    [JsonPropertyName("createdAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("isPublic")]
    [JsonPropertyName("isPublic")]
    [BsonRequired] 
    public bool IsPublic { get; set; }
}