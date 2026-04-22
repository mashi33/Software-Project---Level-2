using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.Models
{
    public class MapMarker
    {
        public string Name { get; set; } = null!;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string Category { get; set; } = null!;
    }

    // ── Google Nearby Search models ──────────────────────────────────────────

    public class GoogleResponse
    {
        [JsonPropertyName("results")]
        public List<GoogleResult> Results { get; set; } = [];
    }

    public class GoogleResult
    {
        [JsonPropertyName("place_id")]
        public string PlaceId { get; set; } = null!;

        [JsonPropertyName("name")]
        public string Name { get; set; } = null!;

        [JsonPropertyName("rating")]
        public double Rating { get; set; }

        [JsonPropertyName("price_level")]
        public int PriceLevel { get; set; }

        [JsonPropertyName("vicinity")]
        public string Vicinity { get; set; } = null!;

        [JsonPropertyName("photos")]
        public List<GooglePhoto>? Photos { get; set; }

        [JsonPropertyName("geometry")]
        public Geometry Geometry { get; set; } = null!;

        [JsonPropertyName("user_ratings_total")]
        public int UserRatingsTotal { get; set; }

        [JsonPropertyName("opening_hours")]
        public OpeningHours? OpeningHours { get; set; }
    }

    public class GooglePhoto
    {
        [JsonPropertyName("photo_reference")]
        public string PhotoReference { get; set; } = null!;
    }

    public class Geometry
    {
        [JsonPropertyName("location")]
        public Location Location { get; set; } = null!;
    }

    public class Location
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lng")]
        public double Lng { get; set; }
    }

    public class OpeningHours
    {
        [JsonPropertyName("open_now")]
        public bool? OpenNow { get; set; }
    }

    // ── Google Geocoding API models ──────────────────────────────────────────

    public class GeocodeResponse
    {
        [JsonPropertyName("results")]
        public List<GeocodeResult> Results { get; set; } = [];
    }

    public class GeocodeResult
    {
        [JsonPropertyName("geometry")]
        public GeocodeGeometry Geometry { get; set; } = null!;
    }

    public class GeocodeGeometry
    {
        [JsonPropertyName("location")]
        public GeocodeLocation Location { get; set; } = null!;
    }

    public class GeocodeLocation
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lng")]
        public double Lng { get; set; }
    }
}