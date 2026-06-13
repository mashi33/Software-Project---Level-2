using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;
using System;

namespace SmartJourneyPlanner.Models
{
    /// <summary>
    /// Represents the user's input for requesting a route.
    /// </summary>
    public class RouteRequest
    {
        public string Start { get; set; } = string.Empty;
        public string End { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a fully computed route saved in MongoDB,
    /// including fastest, cheapest, and scenic route options.
    /// </summary>
    public class SavedRoute
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string StartLocation { get; set; } = string.Empty;
        public string EndLocation { get; set; } = string.Empty;

        public RouteDetail Fastest { get; set; } = default!;
        public RouteDetail Cheapest { get; set; } = default!;
        public RouteDetail Scenic { get; set; } = default!;

        // Interesting places found near the scenic route (parks, landmarks, etc.)
        public List<ViewpointDetail> ScenicViewpoints { get; set; } = new List<ViewpointDetail>();

        // Timestamp used to track when this route was cached
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Holds the key details of a single route option returned by the Google Routes API.
    /// </summary>
    public class RouteDetail
    {
        public string Distance { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public string Polyline { get; set; } = string.Empty; // Encoded polyline for drawing the route on a map
    }

    /// <summary>
    /// Represents a single scenic viewpoint or nearby place of interest along the route.
    /// </summary>
    public class ViewpointDetail
    {
        public string Name { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
    }
}