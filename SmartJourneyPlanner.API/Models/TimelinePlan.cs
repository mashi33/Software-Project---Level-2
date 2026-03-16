using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements]
    public class TimelinePlan
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = "My Trip";

        [JsonPropertyName("startDate")]
        public string StartDate { get; set; } = DateTime.Now.ToString("yyyy-MM-dd");

        [JsonPropertyName("endDate")]
        public string EndDate { get; set; } = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd");
        
        [JsonPropertyName("days")]
        public List<TimelineDay> Days { get; set; } = new();
    }

    [BsonIgnoreExtraElements]
    public class TimelineDay
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonPropertyName("date")]
        public string Date { get; set; } = "";

        [JsonPropertyName("events")]
        public List<TimelineEvent> Events { get; set; } = new();
    }

    [BsonIgnoreExtraElements]
    public class TimelineEvent
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonPropertyName("dayId")]
        public string DayId { get; set; } = "";

        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        [JsonPropertyName("time")]
        public string Time { get; set; } = "";

        [JsonPropertyName("location")]
        public string Location { get; set; } = "";

        [JsonPropertyName("category")]
        public string Category { get; set; } = "Sightseeing"; // Default

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Pending";
    }
}
