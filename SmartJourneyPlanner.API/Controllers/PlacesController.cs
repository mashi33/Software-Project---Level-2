using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlacesController(PlacesService service, IMongoDatabase db) : ControllerBase
    {
        private readonly PlacesService _placeService = service;
        private readonly IMongoCollection<Place> _collection = db.GetCollection<Place>("Places");

        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

        [HttpGet("search")]
        public async Task<IActionResult> GetNearbyPlaces(
            string city,
            string category,
            string? token = null,
            int? budget = null,
            double? rating = null,
            double? maxDistance = null)   // NEW: max distance in km from city center
        {
            string searchCategory = category.ToLower();

            // Step 1: Geocode city name → lat/lon
            var coordinates = await _placeService.GeocodeCity(city);
            if (coordinates == null)
                return BadRequest(new { message = $"Could not find location: {city}" });

            double lat = coordinates.Value.Lat;
            double lon = coordinates.Value.Lon;

            // Step 2: Check MongoDB cache
            string cacheKey = $"{city.ToLower()}_{searchCategory}";
            var cacheCheckTime = DateTime.UtcNow - CacheTtl;

            var cachedCount = await _collection
                .Find(p => p.CacheKey == cacheKey && p.LastFetched >= cacheCheckTime)
                .CountDocumentsAsync();

            if (cachedCount == 0)
            {
                var places = await _placeService.GetPlacesFromGoogle(lat, lon, category, token);
                Console.WriteLine($"[Controller] Google returned {places.Count} places for '{city}'");

                foreach (var p in places)
                {
                    p.Category = searchCategory;
                    p.CacheKey = cacheKey;
                    p.LastFetched = DateTime.UtcNow;

                    var existing = await _collection
                        .Find(x => x.PlaceId == p.PlaceId)
                        .FirstOrDefaultAsync();

                    if (existing != null)
                    {
                        p.Id = existing.Id;
                        await _collection.ReplaceOneAsync(x => x.PlaceId == p.PlaceId, p);
                    }
                    else
                    {
                        await _collection.InsertOneAsync(p);
                    }
                }
            }
            else
            {
                Console.WriteLine($"[Controller] Cache hit for '{cacheKey}' — skipping Google API");
            }

            // Step 3: Query DB with budget and rating filters
            var filterBuilder = Builders<Place>.Filter;
            var dbFilter = filterBuilder.Eq(p => p.CacheKey, cacheKey);

            if (budget.HasValue)
                dbFilter &= filterBuilder.Lte(p => p.PriceLevel, budget.Value);

            if (rating.HasValue)
                dbFilter &= filterBuilder.Gte(p => p.Rating, rating.Value);

            var dbPlaces = await _collection.Find(dbFilter).ToListAsync();

            // Step 4: Calculate Haversine distance for every place from the city center
            // and attach it to the DistanceFromUser field (not stored in DB — computed live)
            foreach (var p in dbPlaces)
            {
                p.DistanceFromUser = PlacesService.CalculateDistance(
                    lat, lon,
                    p.Latitude, p.Longitude
                );
            }

            // Step 5: Apply distance filter in memory (after Haversine calculation)
            if (maxDistance.HasValue)
            {
                dbPlaces = dbPlaces
                    .Where(p => p.DistanceFromUser <= maxDistance.Value)
                    .ToList();
            }

            // Step 6: Sort by distance ascending (nearest first)
            dbPlaces = dbPlaces.OrderBy(p => p.DistanceFromUser).ToList();

            Console.WriteLine($"[Controller] Returning {dbPlaces.Count} places after all filters");

            var response = new
            {
                CenterLat = lat,
                CenterLon = lon,
                FullDetails = dbPlaces,
                Markers = dbPlaces.Select(p => new MapMarker
                {
                    Name = p.Name,
                    Lat = p.Latitude,
                    Lng = p.Longitude,
                    Category = p.Category
                })
            };

            return Ok(response);
        }
    }
}