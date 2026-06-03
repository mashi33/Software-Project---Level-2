/**
 * This file defines the "Models" or data templates for the Trip Timeline.
 * These classes tell C# and MongoDB how to store and transmit our trip data.
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Models
{
    /**
     * TimelinePlan is the main object that represents an entire journey.
     * It contains general trip info and a list of days.
     */
    [BsonIgnoreExtraElements] // This tells MongoDB to ignore any extra data it doesn't recognize
    public class TimelinePlan
    {
        // Unique ID for the plan in the database
        [BsonId] // Marks this as the primary key in MongoDB
        [JsonPropertyName("id")] // Tells the API to use the name "id" in JSON
        public string? Id { get; set; }

        // The name of the trip (e.g. "My Summer Vacation")
        [JsonPropertyName("name")]
        public string Name { get; set; } = "My Trip";

        // When the entire trip starts (formatted as YYYY-MM-DD)
        [JsonPropertyName("startDate")]
        public string StartDate { get; set; } = DateTime.Now.ToString("yyyy-MM-dd");

        // When the entire trip ends
        [JsonPropertyName("endDate")]
        public string EndDate { get; set; } = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd");
        
        // A list of days (TimelineDay objects) that make up this trip
        [JsonPropertyName("days")]
        public List<TimelineDay> Days { get; set; } = new();
    }

    /**
     * TimelineDay represents one specific day in the itinerary (e.g. "Day 1").
     */
    [BsonIgnoreExtraElements]
    public class TimelineDay
    {
        // Unique ID for the day
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // The date for this day (e.g. "Tuesday, June 1, 2026")
        [JsonPropertyName("date")]
        public string Date { get; set; } = "";

        // A list of activities (TimelineEvent objects) happening on this day
        [JsonPropertyName("events")]
        public List<TimelineEvent> Events { get; set; } = new();
    }

    /**
     * TimelineEvent represents a single activity (e.g. a hotel stay, a meal, or a bus ride).
     */
    [BsonIgnoreExtraElements]
    public class TimelineEvent
    {
        // Unique ID for this specific event
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // Link back to the ID of the day this event belongs to
        [JsonPropertyName("dayId")]
        public string DayId { get; set; } = "";

        // Name of the activity (e.g. "Lunch at the beach")
        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        // Extra details or notes about the activity
        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        // The time the activity starts (e.g. "12:30")
        [JsonPropertyName("time")]
        public string Time { get; set; } = "";

        // Where the activity is happening
        [JsonPropertyName("location")]
        public string Location { get; set; } = "";

        // Category of the activity (e.g. Sightseeing, Dining, Hotel, Transport)
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Sightseeing";

        // Current progress status (e.g. Pending, Completed)
        [JsonPropertyName("status")]
        public string Status { get; set; } = "Pending";
    }
}
