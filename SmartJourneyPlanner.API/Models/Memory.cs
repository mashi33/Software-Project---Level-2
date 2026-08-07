using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models;

[BsonIgnoreExtraElements] 
public class TripMemory
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    [JsonPropertyName("id")] 
    public string? Id { get; set; }

    [BsonElement("userId")]
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;
    
    [BsonElement("fullName")]
    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

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
    //UTC enforced to avoid timezone inconsistencies across clients
    public DateTime StartDate { get; set; } = DateTime.UtcNow;

    [BsonElement("endDate")]
    [JsonPropertyName("endDate")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime EndDate { get; set; } = DateTime.UtcNow;
    
    [BsonElement("createdAt")]
    [JsonPropertyName("createdAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("status")]
    [JsonPropertyName("status")]
    public string Status { get; set; } = "Approved";

    [BsonElement("isPublic")]
    [JsonPropertyName("isPublic")]
    public bool? IsPublic { get; set; } // Kept for backward compatibility with old data

    [BsonElement("visibility")]
    [JsonPropertyName("visibility")]
    public string Visibility { get; set; } = "private"; // Options: "private", "public", "tripMembers"

    [BsonElement("likeCount")]
    [JsonPropertyName("likeCount")]
    public int LikeCount { get; set; } = 0;

    [BsonElement("likedByUsers")]
    [JsonPropertyName("likedByUsers")]
    public List<string> LikedByUsers { get; set; } = new List<string>();

    [BsonElement("tripId")]
    [JsonPropertyName("tripId")]
    public string TripId { get; set; } = string.Empty;

    [BsonElement("tripName")]
    [JsonPropertyName("tripName")]
    public string TripName { get; set; } = string.Empty;
}