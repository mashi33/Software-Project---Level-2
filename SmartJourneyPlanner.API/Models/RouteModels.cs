using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;
using System;

namespace SmartJourneyPlanner.Models
{
     //Represents the user's input for requesting a route.
    public class RouteRequest
    {
        public string Start { get; set; } = string.Empty;
        public string End { get; set; } = string.Empty;
    }

    /*Represents a fully computed route saved in MongoDB,
     including fastest, cheapest, and scenic route options.*/
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

    // Holds the key details of a single route option returned by the Google Routes API.
    public class RouteDetail
    {
        public string Distance { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public string Polyline { get; set; } = string.Empty; 
        public double? EstimatedPetrolCost { get; set; } 
        public double? EstimatedDieselCost { get; set; } 
        public BusFareResult? BusFare { get; set; } 
    }

    // Represents a single scenic viewpoint or nearby place of interest along the route.
    public class ViewpointDetail
    {
        public string Name { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUS FARE MODELS
    // ═══════════════════════════════════════════════════════════════

    /* Represents a single inter-provincial bus route in MongoDB.
     Source: NTC Normal Bus Fare Table — Effective 2026-07-06*/
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

        // This is what allows our LINQ query to sort and fetch the best official route!
        [BsonElement("isPrincipal")] 
        public bool IsPrincipal { get; set; } = false;
    }

    /* Represents a single stop on a bus route.
    /// Fare formula: sections_traveled = |dest_section - origin_section|*/
    public class BusStop
    {
        [BsonElement("city")]    public string City    { get; set; } = string.Empty;
        [BsonElement("section")] public int    Section { get; set; }
        [BsonElement("fare")]    public double Fare    { get; set; }
    }

    // NTC universal fare lookup table — sections difference → fare amount.
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

    // Result of a bus fare calculation — direct or 2-leg interchange.
    public class BusFareResult
    {
        public bool   Found      { get; set; } = false;
        public bool   IsMultiLeg { get; set; } = false;
        public bool IsPrincipal { get; set; } = false;
        public bool IsApproximateFare { get; set; } = false;

        // Single leg
        public string? RouteNo { get; set; }
        public string? Via     { get; set; }
        public double? Fare    { get; set; }
        public string? From    { get; set; }  
        public string? To      { get; set; }  

        // Multi leg
        public string? RouteNo1    { get; set; }
        public string? Interchange { get; set; }
        public string? RouteNo2    { get; set; }
        public double? FareLeg1    { get; set; }
        public double? FareLeg2    { get; set; }
        public double? TotalFare   { get; set; }
        public string? ViaLeg1     { get; set; }
        public string? ViaLeg2     { get; set; }

        public string? From1 { get; set; }
        public string? To1   { get; set; }
        public string? From2 { get; set; }
        public string? To2   { get; set; }

        // Multiple direct options — sorted by fare ascending
        public List<BusOption> DirectOptions { get; set; } = new();
    }


        // Represents a single bus route option in multi-result response.
        public class BusOption
        {
            public string RouteNo { get; set; } = string.Empty;
            public double Fare    { get; set; }
            public string? Via    { get; set; }
            public string From    { get; set; } = string.Empty;  
            public string To      { get; set; } = string.Empty;
        }
}