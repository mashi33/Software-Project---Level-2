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
    public class RouteService : IRouteService
    {
        private readonly IMongoCollection<SavedRoute> _routeCollection;
        private readonly string _apiKey;

        public RouteService(IMongoClient client, IConfiguration config)
        {
            var database = client.GetDatabase("SmartJourneyDB");
            _routeCollection = database.GetCollection<SavedRoute>("SavedRoutes");
            _apiKey = config["GoogleApi:ApiKey"] ?? string.Empty;
        }

        public async Task<IActionResult> GetOptimizedRoutesAsync(RouteRequest req)
        {
            if (string.IsNullOrEmpty(_apiKey)) return new BadRequestObjectResult("Google API Key is missing.");

            // --- QUOTA SAVING: CHECK CACHE IN MONGODB ---
            var existingRoute = await _routeCollection
                .Find(r => r.StartLocation == req.Start && r.EndLocation == req.End)
                .FirstOrDefaultAsync();

            if (existingRoute != null)
            {
                return new OkObjectResult(existingRoute);
            }

            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;

            try
            {
                using var handler = new HttpClientHandler { AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate };
                using var client = new HttpClient(handler);
                client.Timeout = TimeSpan.FromSeconds(30);

                client.DefaultRequestHeaders.Add("X-Goog-Api-Key", _apiKey);
                client.DefaultRequestHeaders.Add("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.steps");

                // --- 1. FASTEST ROUTE ---
                var fastestBody = new { origin = new { address = req.Start }, destination = new { address = req.End }, travelMode = "DRIVE", routingPreference = "TRAFFIC_AWARE_OPTIMAL" };

                // --- 2. CHEAPEST ROUTE ---
                var cheapestBody = new { origin = new { address = req.Start }, destination = new { address = req.End }, travelMode = "DRIVE", routingPreference = "TRAFFIC_AWARE", routeModifiers = new { avoidHighways = true, avoidTolls = true, avoidFerries = true } };

                // --- 3. SCENIC ROUTE ---
                var scenicBody = new { origin = new { address = req.Start }, destination = new { address = req.End }, travelMode = "DRIVE", routingPreference = "ROUTING_PREFERENCE_UNSPECIFIED", computeAlternativeRoutes = true, routeModifiers = new { avoidHighways = true } };

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

                if (!fastestDoc.RootElement.TryGetProperty("routes", out JsonElement fRoutes) || fRoutes.GetArrayLength() == 0)
                {
                    return new NotFoundObjectResult(new { message = "Routes not found.", debug = fastestRaw });
                }

                var fRoute = fRoutes[0];
                JsonElement cRoute = (cheapestDoc.RootElement.TryGetProperty("routes", out JsonElement cRoutes) && cRoutes.GetArrayLength() > 0) ? cRoutes[0] : fRoute;
                JsonElement sRoute = (scenicDoc.RootElement.TryGetProperty("routes", out JsonElement sRoutes) && sRoutes.GetArrayLength() > 1) ? sRoutes[1] : (sRoutes.GetArrayLength() > 0 ? sRoutes[0] : fRoute);

                // --- 4. FIND SCENIC VIEWPOINTS ---
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
                                        string name = place.TryGetProperty("name", out JsonElement n) ? n.GetString() : "Scenic Spot";
                                        if (scenicViewpoints.Any(v => v.Name == name)) continue;
                                        var loc = place.GetProperty("geometry").GetProperty("location");
                                        scenicViewpoints.Add(new ViewpointDetail { Name = name, Lat = loc.GetProperty("lat").GetDouble(), Lng = loc.GetProperty("lng").GetDouble() });
                                        addedAtThisPoint++;
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine("Scenic Viewpoints Error: " + ex.Message); }

                var newRoute = new SavedRoute
                {
                    Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
                    StartLocation = req.Start,
                    EndLocation = req.End,
                    Fastest = new RouteDetail { Distance = fRoute.GetProperty("distanceMeters").ToString() + "m", Duration = fRoute.GetProperty("duration").GetString(), Polyline = fRoute.GetProperty("polyline").GetProperty("encodedPolyline").GetString() },
                    Cheapest = new RouteDetail { Distance = cRoute.GetProperty("distanceMeters").ToString() + "m", Duration = cRoute.GetProperty("duration").GetString(), Polyline = cRoute.GetProperty("polyline").GetProperty("encodedPolyline").GetString() },
                    Scenic = new RouteDetail { Distance = sRoute.GetProperty("distanceMeters").ToString() + "m", Duration = sRoute.GetProperty("duration").GetString(), Polyline = sRoute.GetProperty("polyline").GetProperty("encodedPolyline").GetString() },
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
    }
}
