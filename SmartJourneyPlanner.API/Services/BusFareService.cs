using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Services
{
    public class BusFareService
    {
        private readonly IMongoCollection<BusRoute> _busRoutes;
        private readonly IMongoCollection<BusFareTable> _fareTable;

        private List<BusRoute>? _cachedRoutes;
        private Dictionary<int, double>? _cachedFareLookup;
        
        private static readonly SemaphoreSlim _cacheLock = new SemaphoreSlim(1, 1);
        private bool _indexesCreated = false;

        public BusFareService(IMongoClient client)
        {
            var db = client.GetDatabase("SmartJourneyDb");
            _busRoutes = db.GetCollection<BusRoute>("BusRoutes");
            _fareTable = db.GetCollection<BusFareTable>("BusFareTable");

            Task.Run(async () => 
            {
                try
                {
                    Console.WriteLine("🔄 Pre-loading Bus Fare Cache and Indexes in background...");
                    await EnsureCacheAsync(); 
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Background pre-loading failed: {ex.Message}");
                }
            });
        }

        private async Task EnsureCacheAsync()
        {
            if (_cachedRoutes != null && _cachedFareLookup != null && _indexesCreated) return;

            await _cacheLock.WaitAsync();
            try
            {
                if (_cachedRoutes == null || _cachedFareLookup == null)
                {
                    Console.WriteLine("⏳ Loading bus data into memory cache (Timeout: 180s)...");
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(180));

                    var fareEntries = await Task.Run(() => 
                        _fareTable.Find(_ => true).ToEnumerable(cts.Token).ToList(), cts.Token);

                    // ⚡ avoid duplicate keys
                    _cachedFareLookup = fareEntries
                        .GroupBy(f => f.Sections)
                        .ToDictionary(g => g.Key, g => g.First().Fare);

                    var routes = await Task.Run(() => 
                        _busRoutes.Find(_ => true).ToEnumerable(cts.Token).ToList(), cts.Token);
                    _cachedRoutes = routes;

                    Console.WriteLine($"🚀 Bus Cache loaded successfully: {_cachedRoutes.Count} routes.");
                }

                // Ensure MongoDB Indexes are created for performance
                if (!_indexesCreated)
                {
                    Console.WriteLine("⚙️ Optimizing MongoDB Indexes...");
                    await _fareTable.Indexes.CreateOneAsync(
                        new CreateIndexModel<BusFareTable>(Builders<BusFareTable>.IndexKeys.Ascending(f => f.Sections))
                    );
                    await _fareRoutesIndex();
                    _indexesCreated = true;
                    Console.WriteLine("✅ MongoDB Indexes are optimized!");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Cache initialization failed: {ex.Message}");
            }
            finally
            {
                _cacheLock.Release();
            }
        }

        private async Task _fareRoutesIndex()
        {
            await _busRoutes.Indexes.CreateOneAsync(
                new CreateIndexModel<BusRoute>(Builders<BusRoute>.IndexKeys.Ascending("stops.city"))
            );
        }

        private string ExtractCity(string fullAddress)
        {
            if (string.IsNullOrWhiteSpace(fullAddress)) return string.Empty;

            var parts = fullAddress.Split(',').Select(p => p.Trim()).ToList();
            
            // extract logic for Sri Lankan addresses
            if (parts.Count > 1)
            {
                if (parts.Last().Equals("Sri Lanka", StringComparison.OrdinalIgnoreCase))
                {
                    return parts[parts.Count - 2]; 
                }
                return parts.Last(); 
            }

            return parts[0];
        }

        // Helper method to get fare between two cities on a given route
        private double? GetFare(BusRoute route, string fromCity, string toCity, Dictionary<int, double> fareLookup)
        {
            int fromIdx = route.Stops.FindIndex(s => s.City.Equals(fromCity, StringComparison.OrdinalIgnoreCase));
            int toIdx = route.Stops.FindIndex(s => s.City.Equals(toCity, StringComparison.OrdinalIgnoreCase));

            if (fromIdx == -1 || toIdx == -1) return null;

            var fromStop = route.Stops[fromIdx];
            var toStop = route.Stops[toIdx];

            int diff = Math.Abs(toStop.Section - fromStop.Section);
            return fareLookup.TryGetValue(diff, out double fare) ? fare : null;
        }

        //Clear cache before next request
        public void ClearCache()
        {
            _cachedRoutes = null;
            _cachedFareLookup = null;
            Console.WriteLine("♻️ Bus fare cache cleared. It will reload on next request.");
        }

        // Main method to get bus fare between two addresses
        public async Task<BusFareResult> GetBusFareAsync(string startAddress, string endAddress)
        {
            await EnsureCacheAsync();

            if (_cachedRoutes == null || _cachedFareLookup == null)
            {
                Console.WriteLine("❌ Cannot calculate fare because bus cache is empty or failed to load.");
                return new BusFareResult { Found = false };
            }

            string from = ExtractCity(startAddress);
            string to = ExtractCity(endAddress);

            if (from.Equals(to, StringComparison.OrdinalIgnoreCase))
            {
                return new BusFareResult
                {
                    Found = true,
                    IsMultiLeg = false,
                    RouteNo = "N/A",
                    Via = "Same Location",
                    Fare = 0.00
                };
            }

            Console.WriteLine($"Bus fare search: '{from}' → '{to}'");

            BusFareResult? bestDirectResult = null;

            // ── 1. Find Cheapest Direct Route ───────────────────────────
            var directRoute = _cachedRoutes
                .Select(r => new { Route = r, Fare = GetFare(r, from, to, _cachedFareLookup) })
                .Where(x => x.Fare.HasValue)
                .OrderBy(x => x.Fare!.Value)
                .FirstOrDefault();

            if (directRoute != null)
            {
                int fIdx = directRoute.Route.Stops.FindIndex(s => s.City.Equals(from, StringComparison.OrdinalIgnoreCase));
                int tIdx = directRoute.Route.Stops.FindIndex(s => s.City.Equals(to, StringComparison.OrdinalIgnoreCase));

                int start = Math.Min(fIdx, tIdx);
                int end = Math.Max(fIdx, tIdx);
                
                var midStops = directRoute.Route.Stops
                    .Skip(start + 1)
                    .Take(end - start - 1)
                    .Select(s => s.City);

                string viaCities = string.Join(", ", midStops);

                bestDirectResult = new BusFareResult
                {
                    Found = true,
                    IsMultiLeg = false,
                    RouteNo = directRoute.Route.RouteNo,
                    Via = !string.IsNullOrEmpty(viaCities) ? viaCities : directRoute.Route.Via,
                    Fare = Math.Round(directRoute.Fare!.Value, 2)
                };
            }

            //if found direct route (Huge Performance Win!)
            if (bestDirectResult != null)
            {
                Console.WriteLine("🚀 Direct route found. Skipping expensive interchange calculations entirely!");
                return bestDirectResult;
            }

            // ── 2. Find Cheapest 2-Leg Interchange Route (Lazy-Calculated) ───────────────────
            var leg1Candidates = _cachedRoutes
                .Where(r => r.Stops.Any(s => s.City.Equals(from, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            var possibleInterchanges = new List<(BusRoute Leg1, BusRoute Leg2, string Interchange, double Fare1, double Fare2, double Total)>();

            foreach (var leg1 in leg1Candidates)
            {
                var validInterchanges = leg1.Stops
                    .Where(s => !s.City.Equals(from, StringComparison.OrdinalIgnoreCase))
                    .Select(s => s.City)
                    .ToList();

                foreach (var interchange in validInterchanges)
                {
                    var validLeg2Candidates = _cachedRoutes
                        .Where(r => r.RouteNo != leg1.RouteNo && 
                                    r.Stops.Any(s => s.City.Equals(interchange, StringComparison.OrdinalIgnoreCase)) && 
                                    r.Stops.Any(s => s.City.Equals(to, StringComparison.OrdinalIgnoreCase)))
                        .Select(r => new { Route = r, Fare = GetFare(r, interchange, to, _cachedFareLookup) })
                        .Where(x => x.Fare.HasValue)
                        .ToList();

                    if (!validLeg2Candidates.Any()) continue;

                    var fare1 = GetFare(leg1, from, interchange, _cachedFareLookup);
                    if (!fare1.HasValue) continue;

                    foreach (var leg2 in validLeg2Candidates)
                    {
                        possibleInterchanges.Add((
                            leg1, 
                            leg2.Route, 
                            interchange, 
                            fare1.Value, 
                            leg2.Fare!.Value, 
                            fare1.Value + leg2.Fare.Value
                        ));
                    }
                }
            }

            BusFareResult? bestInterchangeResult = null;

            if (possibleInterchanges.Any())
            {
                var bestFit = possibleInterchanges
                    .OrderBy(x => x.Total)
                    .First();

                int fIdx1 = bestFit.Leg1.Stops.FindIndex(s => s.City.Equals(from, StringComparison.OrdinalIgnoreCase));
                int tIdx1 = bestFit.Leg1.Stops.FindIndex(s => s.City.Equals(bestFit.Interchange, StringComparison.OrdinalIgnoreCase));
                int start1 = Math.Min(fIdx1, tIdx1);
                int end1 = Math.Max(fIdx1, tIdx1);
                var midStops1 = bestFit.Leg1.Stops.Skip(start1 + 1).Take(end1 - start1 - 1).Select(s => s.City);
                string viaLeg1 = string.Join(", ", midStops1);

                int fIdx2 = bestFit.Leg2.Stops.FindIndex(s => s.City.Equals(bestFit.Interchange, StringComparison.OrdinalIgnoreCase));
                int tIdx2 = bestFit.Leg2.Stops.FindIndex(s => s.City.Equals(to, StringComparison.OrdinalIgnoreCase));
                int start2 = Math.Min(fIdx2, tIdx2);
                int end2 = Math.Max(fIdx2, tIdx2);
                var midStops2 = bestFit.Leg2.Stops.Skip(start2 + 1).Take(end2 - start2 - 1).Select(s => s.City);
                string viaLeg2 = string.Join(", ", midStops2);

                string finalVia1 = !string.IsNullOrEmpty(viaLeg1) ? viaLeg1 : bestFit.Leg1.Via;
                string finalVia2 = !string.IsNullOrEmpty(viaLeg2) ? viaLeg2 : bestFit.Leg2.Via;

                bestInterchangeResult = new BusFareResult
                {
                    Found = true,
                    IsMultiLeg = true,
                    RouteNo1 = bestFit.Leg1.RouteNo,
                    Interchange = bestFit.Interchange,
                    RouteNo2 = bestFit.Leg2.RouteNo,
                    FareLeg1 = Math.Round(bestFit.Fare1, 2),
                    FareLeg2 = Math.Round(bestFit.Fare2, 2),
                    TotalFare = Math.Round(bestFit.Total, 2),
                    ViaLeg1 = finalVia1,
                    ViaLeg2 = finalVia2,
                    Via = $"Leg 1 Via: {finalVia1} | Leg 2 Via: {finalVia2}"
                };
            }

            // ── 3. Fallback Return ──
            if (bestInterchangeResult != null)
            {
                return bestInterchangeResult;
            }

            return new BusFareResult { Found = false };
        }
    }
}