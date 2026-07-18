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
        public double? EstimatedPetrolCost { get; set; } // ✅ Petrol vehicle  cost
        public double? EstimatedDieselCost { get; set; } // ✅ Diesel vehicle  cost
        public BusFareResult? BusFare { get; set; } // ✅ Bus fare result
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

    // ═══════════════════════════════════════════════════════════════
    // BUS FARE MODELS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>
    /// Represents a single inter-provincial bus route in MongoDB.
    /// Source: NTC Normal Bus Fare Table — Effective 2026-07-06
    /// </summary>
    public class BusRoute
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("routeNo")]   public string        RouteNo   { get; set; } = string.Empty;
        [BsonElement("from")]      public string        From      { get; set; } = string.Empty;
        [BsonElement("to")]        public string        To        { get; set; } = string.Empty;
        [BsonElement("via")]       public string        Via       { get; set; } = string.Empty;
        [BsonElement("totalFare")] public double        TotalFare { get; set; }
        [BsonElement("stops")]     public List<BusStop> Stops     { get; set; } = new();
    }

    /// <summary>
    /// Represents a single stop on a bus route.
    /// Fare formula: sections_traveled = |dest_section - origin_section|
    /// </summary>
    public class BusStop
    {
        [BsonElement("city")]    public string City    { get; set; } = string.Empty;
        [BsonElement("section")] public int    Section { get; set; }
        [BsonElement("fare")]    public double Fare    { get; set; }
    }

    /// <summary>
    /// NTC universal fare lookup table — sections difference → fare amount.
    /// </summary>
    public class BusFareTable
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id       { get; set; }

        [BsonElement("sections")]
        public int     Sections { get; set; }

        [BsonElement("fare")] 
        public double  Fare     { get; set; }
    }

    /// <summary>
    /// Result of a bus fare calculation — direct or 2-leg interchange.
    /// </summary>
    public class BusFareResult
    {
        public bool   Found      { get; set; } = false;
        public bool   IsMultiLeg { get; set; } = false;

        // Single leg
        public string? RouteNo { get; set; }
        public string? Via     { get; set; }
        public string? ViaLeg1 { get; set; }
        public string? ViaLeg2 { get; set; }
        public double? Fare    { get; set; }

        // Multi leg
        public string? RouteNo1    { get; set; }
        public string? Interchange { get; set; }
        public string? RouteNo2    { get; set; }
        public double? FareLeg1    { get; set; }
        public double? FareLeg2    { get; set; }
        public double? TotalFare   { get; set; }
    }
}