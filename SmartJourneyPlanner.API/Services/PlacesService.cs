using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Services
{
    public class PlacesService(HttpClient httpClient, IConfiguration configuration)
    {
        private readonly HttpClient _httpClient = httpClient;
        private readonly string _apiKey = configuration.GetSection("GoogleApi")["ApiKey"] ?? "";

        // Converts city/town name → lat/lon using Google Geocoding API
        public async Task<(double Lat, double Lon)?> GeocodeCity(string cityName)
        {
            string url = $"https://maps.googleapis.com/maps/api/geocode/json" +
                         $"?address={Uri.EscapeDataString(cityName)}" +
                         $"&key={_apiKey}";

            Console.WriteLine($"[Geocode Request]: {url}");

            try
            {
                var response = await _httpClient.GetFromJsonAsync<GeocodeResponse>(url);

                if (response?.Results == null || response.Results.Count == 0)
                {
                    Console.WriteLine($"[Geocode] No results for '{cityName}'");
                    return null;
                }

                var location = response.Results[0].Geometry.Location;
                Console.WriteLine($"[Geocode] '{cityName}' → lat:{location.Lat}, lon:{location.Lng}");

                return (location.Lat, location.Lng);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Geocode Error]: {ex.Message}");
                return null;
            }
        }

        // Haversine formula — calculates straight-line distance in kilometers
        // between two geographic coordinates
        public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double EarthRadiusKm = 6371.0;

            double dLat = ToRadians(lat2 - lat1);
            double dLon = ToRadians(lon2 - lon1);

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return EarthRadiusKm * c;
        }

        private static double ToRadians(double degrees) => degrees * (Math.PI / 180.0);

        // Fetches nearby places from Google Nearby Search API
        public async Task<List<Place>> GetPlacesFromGoogle(double lat, double lon, string category, string? token)
        {
            string type = string.Equals(category, "hotel", StringComparison.OrdinalIgnoreCase)
                ? "lodging"
                : "restaurant";

            string sessionTokenParam = string.IsNullOrEmpty(token) ? "" : $"&sessiontoken={token}";

            string url = $"https://maps.googleapis.com/maps/api/place/nearbysearch/json" +
                         $"?location={lat},{lon}" +
                         $"&radius=5000" +
                         $"&type={type}" +
                         $"&rankby=prominence" +
                         $"&key={_apiKey}" +
                         sessionTokenParam;

            Console.WriteLine($"[Nearby Search Request]: {url}");

            try
            {
                var response = await _httpClient.GetFromJsonAsync<GoogleResponse>(url);

                if (response?.Results == null || response.Results.Count == 0)
                {
                    var rawError = await _httpClient.GetStringAsync(url);
                    Console.WriteLine($"[Google API No Data]: {rawError}");
                    return [];
                }

                return response.Results.Select(r => new Place
                {
                    PlaceId = r.PlaceId,
                    Name = r.Name,
                    Rating = r.Rating,
                    PriceLevel = r.PriceLevel,
                    Address = r.Vicinity,
                    Category = category.ToLower(),
                    PhotoReference = r.Photos?.FirstOrDefault()?.PhotoReference,
                    Latitude = r.Geometry.Location.Lat,
                    Longitude = r.Geometry.Location.Lng,
                    UserRatingsTotal = r.UserRatingsTotal,
                    IsOpenNow = r.OpeningHours?.OpenNow
                }).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PlacesService Error]: {ex.Message}");
                return [];
            }
        }
    }
}