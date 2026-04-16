// This file defines the data structure for the Trip Timeline.
// It uses MongoDB attributes for database mapping and JSON attributes for API communication.

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models
{
    // Represents the entire trip plan
    [BsonIgnoreExtraElements]
    public class TimelinePlan
    {
        // Unique ID for the plan, stored as an ObjectId in MongoDB
        // Unique ID for the plan
        [BsonId]
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        // The name of the trip (e.g., "My Summer Vacation")
        [JsonPropertyName("name")]
        public string Name { get; set; } = "My Trip";

        // When the trip starts
        [JsonPropertyName("startDate")]
        public string StartDate { get; set; } = DateTime.Now.ToString("yyyy-MM-dd");

        // When the trip ends
        [JsonPropertyName("endDate")]
        public string EndDate { get; set; } = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd");
        
        // A list of days included in this trip
        [JsonPropertyName("days")]
        public List<TimelineDay> Days { get; set; } = new();
    }

    // Represents a single day in the trip
    [BsonIgnoreExtraElements]
    public class TimelineDay
    {
        // Unique ID for the day
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // The specific date for this day
        [JsonPropertyName("date")]
        public string Date { get; set; } = "";

        // A list of events (activities) happening on this day
        [JsonPropertyName("events")]
        public List<TimelineEvent> Events { get; set; } = new();
    }

    // Represents a single activity or event in a day
    [BsonIgnoreExtraElements]
    public class TimelineEvent
    {
        // Unique ID for the event
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // Link to the day this event belongs to
        [JsonPropertyName("dayId")]
        public string DayId { get; set; } = "";

        // Title of the activity (e.g., "Lunch at Galle Face")
        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        // More details about the activity
        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        // Time the activity starts
        [JsonPropertyName("time")]
        public string Time { get; set; } = "";

        // Where the activity takes place
        [JsonPropertyName("location")]
        public string Location { get; set; } = "";

        // Type of activity (e.g., Sightseeing, Transport, Dining)
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Sightseeing"; // Default

        // Current status (e.g., Pending, Completed)
        [JsonPropertyName("status")]
        public string Status { get; set; } = "Pending";
    }
}
