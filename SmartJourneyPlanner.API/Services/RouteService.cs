using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Interfaces;
using System.Text.Json;
using System.Net.Http.Json;
using System.Net;

namespace SmartJourneyPlanner.Services
#nullable disable
{

    /* Handles route optimization by fetching fastest, cheapest, and scenic routes
     from the Google Routes API, with MongoDB caching to reduce API quota usage.*/
    public class RouteService : IRouteService
    {
        private readonly IMongoCollection<SavedRoute> _routeCollection;
        private readonly string _apiKey;
        private readonly FuelPriceService _fuelPriceService;
        private readonly BusFareService _busFareService;

        // Average fuel consumption per vehicle type (litres per 100km)
        private const double AVG_PETROL_CONSUMPTION = 7.5;
        private const double AVG_DIESEL_CONSUMPTION = 6.5;

        // Initializes the service with a MongoDB client, app configuration, and fuel price service.
        public RouteService(IMongoClient client, IConfiguration config, FuelPriceService fuelPriceService, BusFareService busFareService)
        {
            var database = client.GetDatabase("SmartJourneyDb");
            _routeCollection = database.GetCollection<SavedRoute>("SavedRoutes");
            _apiKey = config["GoogleApi:ApiKey"] ?? string.Empty;
            _fuelPriceService = fuelPriceService;
            _busFareService = busFareService;
        }

        /* Calculates estimated petrol and diesel fuel costs for a given distance.
        /// Returns null for either if the live price could not be fetched.*/
        private async Task<(double? petrolCost, double? dieselCost)> CalculateFuelCosts(double distanceMeters)
        {
            var (petrolPrice, dieselPrice) = await _fuelPriceService.GetFuelPricesAsync();
            double distanceKm = distanceMeters / 1000;

            double? petrolCost = petrolPrice.HasValue
                ? Math.Round((distanceKm / 100) * AVG_PETROL_CONSUMPTION * petrolPrice.Value, 2)
                : null;

            double? dieselCost = dieselPrice.HasValue
                ? Math.Round((distanceKm / 100) * AVG_DIESEL_CONSUMPTION * dieselPrice.Value, 2)
                : null;

            return (petrolCost, dieselCost);
        }

        /* Find fastest, cheapest, and scenic routes between two locations using Google Routes API.
         Caches results in MongoDB to reduce API calls and improve response times.*/
        public async Task<IActionResult> GetOptimizedRoutesAsync(RouteRequest req)
        {
            if (string.IsNullOrEmpty(_apiKey)) return new BadRequestObjectResult("Google API Key is missing.");

            var existingRoute = await _routeCollection
                .Find(r => r.StartLocation == req.Start && r.EndLocation == req.End)
                .FirstOrDefaultAsync();

            if (existingRoute != null)
            {
                return new OkObjectResult(existingRoute);
            }

            try
            {
                // HttpClient handles TLS automatically
                using var handler = new HttpClientHandler { AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate };
                using var client = new HttpClient(handler);
                client.Timeout = TimeSpan.FromSeconds(30);

                // Attach API key and limit response fields to only what we need
                client.DefaultRequestHeaders.Add("X-Goog-Api-Key", _apiKey);
                client.DefaultRequestHeaders.Add("X-Goog-FieldMask",
                    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.steps");

                // Fastest: traffic-aware optimal routing, no restrictions
                var fastestBody = new { origin = new { address = req.Start }, destination = new { address = req.End }, travelMode = "DRIVE", routingPreference = "TRAFFIC_AWARE_OPTIMAL" };

                // Cheapest: avoids highways, tolls, and ferries to reduce travel cost
                var cheapestBody = new { origin = new { address = req.Start }, destination = new { address = req.End }, travelMode = "DRIVE", routingPreference = "TRAFFIC_AWARE", routeModifiers = new { avoidHighways = true, avoidTolls = true, avoidFerries = true } };

                // Scenic: requests alternative routes while avoiding highways
                var scenicBody = new { origin = new { address = req.Start }, destination = new { address = req.End }, travelMode = "DRIVE", routingPreference = "ROUTING_PREFERENCE_UNSPECIFIED", computeAlternativeRoutes = true, routeModifiers = new { avoidHighways = true } };

                // Fire all three route requests simultaneously to save time
                var fastestTask = client.PostAsJsonAsync("https://routes.googleapis.com/directions/v2:computeRoutes", fastestBody);
                var cheapestTask = client.PostAsJsonAsync("https://routes.googleapis.com/directions/v2:computeRoutes", cheapestBody);
                var scenicTask = client.PostAsJsonAsync("https://routes.googleapis.com/directions/v2:computeRoutes", scenicBody);

                await Task.WhenAll(fastestTask, cheapestTask, scenicTask);

                var fastestRaw = await fastestTask.Result.Content.ReadAsStringAsync();
                var cheapestRaw = await cheapestTask.Result.Content.ReadAsStringAsync();
                var scenicRaw = await scenicTask.Result.Content.ReadAsStringAsync();

                using var fastestDoc = JsonDocument.Parse(fastestRaw);
                using var cheapestDoc = JsonDocument.Parse(cheapestRaw);
                using var scenicDoc = JsonDocument.Parse(scenicRaw);

                // Fallback if not found fastest route, which is critical for the rest of the logic
                if (!fastestDoc.RootElement.TryGetProperty("routes", out JsonElement fRoutes) || fRoutes.GetArrayLength() == 0)
                {
                    return new NotFoundObjectResult(new { message = "Routes not found.", debug = fastestRaw });
                }

                var fRoute = fRoutes[0];
                // Fall back to fastest route if cheapest returned no results
                JsonElement cRoute = (cheapestDoc.RootElement.TryGetProperty("routes", out JsonElement cRoutes) && cRoutes.GetArrayLength() > 0) ? cRoutes[0] : fRoute;

                // Prefer the second alternative for scenic; fall back to first or fastest
                JsonElement sRoute = (scenicDoc.RootElement.TryGetProperty("routes", out JsonElement sRoutes) && sRoutes.GetArrayLength() > 1) ? sRoutes[1] : (sRoutes.GetArrayLength() > 0 ? sRoutes[0] : fRoute);

                /* Find interesting nearby places along the scenic route (Scenic Algorithm: sample up to 4 waypoints spaced at least 30km apart, 
                 starting after 20km, then search for parks, landmarks, and cultural spots within 10km of each waypoint)*/
                var scenicViewpoints = new List<ViewpointDetail>();

                try
                {
                    if (sRoute.TryGetProperty("legs", out JsonElement legs) && legs.GetArrayLength() > 0)
                    {
                        var steps = legs[0].GetProperty("steps").EnumerateArray();
                        double currentDistance = 0;
                        double lastSearchDistance = 0;
                        var pointsToSearch = new List<JsonElement>();

                        foreach (var step in steps)
                        {
                            currentDistance += step.GetProperty("distanceMeters").GetDouble();
                            if (currentDistance >= 20000 && (pointsToSearch.Count == 0 || (currentDistance - lastSearchDistance) >= 30000))
                            {
                                pointsToSearch.Add(step.GetProperty("startLocation").GetProperty("latLng"));
                                lastSearchDistance = currentDistance;
                                if (pointsToSearch.Count >= 4) break;
                            }
                        }

                        // Search for parks, landmarks, and cultural spots near each sampled waypoint
                        foreach (var point in pointsToSearch)
                        {
                            double lat = point.GetProperty("latitude").GetDouble();
                            double lng = point.GetProperty("longitude").GetDouble();
                            string categories = "park|natural_feature|museum|historical_landmark|hindu_temple|place_of_worship";
                            var placesUrl = $"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=10000&type={categories}&key={_apiKey}";
                            var placesRes = await client.GetAsync(placesUrl);

                            if (placesRes.IsSuccessStatusCode)
                            {
                                var placesData = await placesRes.Content.ReadFromJsonAsync<JsonElement>();
                                if (placesData.TryGetProperty("results", out JsonElement results))
                                {
                                    int addedAtThisPoint = 0;
                                    foreach (var place in results.EnumerateArray())
                                    {
                                        if (addedAtThisPoint >= 3) break;

                                        string name = place.TryGetProperty("name", out JsonElement n)
                                                    ? n.GetString() : "Scenic Spot";

                                        // loc is checked against existing viewpoints before adding, to avoid duplicates
                                        var loc = place.GetProperty("geometry").GetProperty("location");

                                        if (scenicViewpoints.Any(v =>
                                            Math.Abs(v.Lat - loc.GetProperty("lat").GetDouble()) < 0.001 &&
                                            Math.Abs(v.Lng - loc.GetProperty("lng").GetDouble()) < 0.001)) continue;

                                        scenicViewpoints.Add(new ViewpointDetail
                                        {
                                            Name = name,
                                            Lat = loc.GetProperty("lat").GetDouble(),
                                            Lng = loc.GetProperty("lng").GetDouble()
                                        });
                                        addedAtThisPoint++;
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine("Scenic Viewpoints Error: " + ex.Message); }

                // Calculate fuel costs for all 3 routes using live CPC prices
                var (fastestPetrol, fastestDiesel) = await CalculateFuelCosts(fRoute.GetProperty("distanceMeters").GetDouble());
                var (cheapestPetrol, cheapestDiesel) = await CalculateFuelCosts(cRoute.GetProperty("distanceMeters").GetDouble());
                var (scenicPetrol, scenicDiesel) = await CalculateFuelCosts(sRoute.GetProperty("distanceMeters").GetDouble());

                // Build the final route object and save it to MongoDB for future cache hits
                var newRoute = new SavedRoute
                {
                    Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                    StartLocation = req.Start,
                    EndLocation = req.End,
                    Fastest = new RouteDetail
                    {
                        Distance = fRoute.GetProperty("distanceMeters").ToString() + "m",
                        Duration = fRoute.GetProperty("duration").GetString() ?? string.Empty,
                        Polyline = fRoute.GetProperty("polyline").GetProperty("encodedPolyline").GetString(),
                        EstimatedPetrolCost = fastestPetrol,
                        EstimatedDieselCost = fastestDiesel
                    },
                    Cheapest = new RouteDetail
                    {
                        Distance = cRoute.GetProperty("distanceMeters").ToString() + "m",
                        Duration = cRoute.GetProperty("duration").GetString() ?? string.Empty,
                        Polyline = cRoute.GetProperty("polyline").GetProperty("encodedPolyline").GetString(),
                        EstimatedPetrolCost = cheapestPetrol,
                        EstimatedDieselCost = cheapestDiesel
                    },
                    Scenic = new RouteDetail
                    {
                        Distance = sRoute.GetProperty("distanceMeters").ToString() + "m",
                        Duration = sRoute.GetProperty("duration").GetString() ?? string.Empty,
                        Polyline = sRoute.GetProperty("polyline").GetProperty("encodedPolyline").GetString(),
                        EstimatedPetrolCost = scenicPetrol,
                        EstimatedDieselCost = scenicDiesel
                    },
                    ScenicViewpoints = scenicViewpoints
                };

                await _routeCollection.InsertOneAsync(newRoute);
                return new OkObjectResult(newRoute);
            }
            catch (Exception ex)
            {
                return new ObjectResult(new { message = "Error", details = ex.Message }) { StatusCode = 500 };
            }
        }

        /* Returns NTC bus fare for the given start and end locations.
         Used when user selects Public Transport mode on the frontend.*/
        public async Task<IActionResult> GetBusFareAsync(RouteRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Start) || string.IsNullOrWhiteSpace(req.End))
                return new BadRequestObjectResult("Start and End locations are required.");

            var result = await _busFareService.GetBusFareAsync(req.Start, req.End);
            return new OkObjectResult(result);
        }
    }
}