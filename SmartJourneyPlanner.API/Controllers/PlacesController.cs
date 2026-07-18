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
            double? maxDistance = null)
        {
            // ✅ try/catch —no backend crash
            try
            {

                // ✅ NEW — API key missing check
                if (string.IsNullOrWhiteSpace(_placeService.ApiKey))
                    return StatusCode(503, new { message = "API key is not configured." });

                if (string.IsNullOrWhiteSpace(city))
                    return BadRequest(new { message = "City name cannot be empty." });
                // ✅ Empty city check
                if (string.IsNullOrWhiteSpace(city))
                    return BadRequest(new { message = "City name cannot be empty." });

                // ✅ Empty category check
                if (string.IsNullOrWhiteSpace(category))
                    return BadRequest(new { message = "Category cannot be empty." });

                string searchCategory = category.ToLower();

                // ✅ Geocode — once only
                var coordinates = await _placeService.GeocodeCity(city);
                if (coordinates == null)
                {
                    // ✅ distinguish between network error and no results
                    if (_placeService.LastGeocodeNetworkError)
                        return StatusCode(503, new { message = "Network error. Please check your internet connection." });

                    return NotFound(new { message = $"'{city}' cannot be found. Try a different city or check the spelling." });
                }

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

                // Step 3: Query DB with filters
                var filterBuilder = Builders<Place>.Filter;
                var dbFilter = filterBuilder.Eq(p => p.CacheKey, cacheKey);

                if (budget.HasValue)
                    dbFilter &= filterBuilder.Lte(p => p.PriceLevel, budget.Value);

                if (rating.HasValue)
                    dbFilter &= filterBuilder.Gte(p => p.Rating, rating.Value);

                var dbPlaces = await _collection.Find(dbFilter).ToListAsync();

                // Step 4: Haversine distance
                foreach (var p in dbPlaces)
                {
                    p.DistanceFromUser = PlacesService.CalculateDistance(
                        lat, lon,
                        p.Latitude, p.Longitude
                    );
                }

                // Step 5: Distance filter
                if (maxDistance.HasValue)
                {
                    dbPlaces = dbPlaces
                        .Where(p => p.DistanceFromUser <= maxDistance.Value)
                        .ToList();
                }

                // Step 6: Sort by distance
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

            catch (MongoDB.Driver.MongoConnectionException ex)
            {
                Console.WriteLine($"[MongoDB Connection Error]: {ex.Message}");
                return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
            }
            catch (TimeoutException ex)
            {
                Console.WriteLine($"[MongoDB Timeout]: {ex.Message}");
                return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
            }
            catch (TaskCanceledException ex)
            {
                Console.WriteLine($"[Timeout — No Internet]: {ex.Message}");
                return StatusCode(503, new { message = "Network error. Please check your internet connection." });
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"[Network Error]: {ex.Message}");
                return StatusCode(503, new { message = "Network error. Please check your internet connection." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PlacesController Error]: {ex.Message}");
                return StatusCode(500, new { message = "An unexpected error occurred. Please try again." });
            }
        }
    }
}