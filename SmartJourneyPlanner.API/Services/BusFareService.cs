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

            List<BusFareTable>? fareEntries = null;
            List<BusRoute>? routes = null;

            try
            {
                if (_cachedRoutes == null || _cachedFareLookup == null)
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(60));

                    fareEntries = await Task.Run(() =>
                        _fareTable.Find(_ => true).ToEnumerable(cts.Token).ToList(), cts.Token);

                    routes = await Task.Run(() =>
                        _busRoutes.Find(_ => true).ToEnumerable(cts.Token).ToList(), cts.Token);
                }

                await _cacheLock.WaitAsync();
                try
                {
                    if (_cachedFareLookup == null && fareEntries != null)
                    {
                        // Guard against duplicate "Sections" keys corrupting the whole cache load
                        _cachedFareLookup = fareEntries
                            .GroupBy(f => f.Sections)
                            .ToDictionary(g => g.Key, g => g.First().Fare);
                    }

                    if (_cachedRoutes == null && routes != null)
                    {
                        _cachedRoutes = routes;
                    }

                    if (!_indexesCreated)
                    {
                        await _fareTable.Indexes.CreateOneAsync(
                            new CreateIndexModel<BusFareTable>(Builders<BusFareTable>.IndexKeys.Ascending(f => f.Sections))
                        );
                        await _fareRoutesIndex();
                        _indexesCreated = true;
                    }
                }
                finally
                {
                    _cacheLock.Release();
                }
            }
            catch (OperationCanceledException)
            {
                // The 60s CancellationTokenSource above tripped — MongoDB Atlas
                // didn't respond in time (slow/no internet connection, cold-start cluster).
                Console.WriteLine("⚠️ Bus route cache load timed out — MongoDB did not respond within 60s.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Cache initialization failed: {ex.Message}");
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

        // Calculates fare between two cities on a given route.
        private double? GetFare(BusRoute route, string fromCity, string toCity, Dictionary<int, double> fareLookup, out bool isApproximate)
        {
            isApproximate = false;

            int fromIdx = route.Stops.FindIndex(s => s.City.Equals(fromCity, StringComparison.OrdinalIgnoreCase));
            int toIdx = route.Stops.FindIndex(s => s.City.Equals(toCity, StringComparison.OrdinalIgnoreCase));

            // Accurate path: both stops found in the Stops array -> exact section-based fare
            if (fromIdx != -1 && toIdx != -1)
            {
                var fromStop = route.Stops[fromIdx];
                var toStop = route.Stops[toIdx];

                int diff = Math.Abs(toStop.Section - fromStop.Section);
                return fareLookup.TryGetValue(diff, out double fare) ? fare : null;
            }

            return null;
        }

        public void ClearCache()
        {
            _cachedRoutes = null;
            _cachedFareLookup = null;
        }

        /* "Best route" = direct route first (most Sri Lankan travellers prefer one bus over transfers),
         with IsPrincipal routes preferred over non-principal, then cheapest among ties.
         Falls back to a 2-leg interchange only when no direct route exists.*/
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

            // Direct Routes — up to 5, Principal-first, cheapest, accurate fare priority ──
            var allDirectMatches = _cachedRoutes
                .Select(r =>
                {
                    var fare = GetFare(r, from, to, _cachedFareLookup, out bool approx);
                    return new { Route = r, Fare = fare, IsApproximate = approx };
                })
                .Where(x => x.Fare.HasValue)
                .GroupBy(x => x.Route.RouteNo)   // pick cheapest per route number
                .Select(g => g.OrderBy(x => x.Fare!.Value)
                  .ThenByDescending(x => x.Route.IsPrincipal)
                  .First())
                .OrderByDescending(x => x.Route.IsPrincipal)
                .ThenBy(x => x.IsApproximate)
                .ThenBy(x => x.Fare!.Value)
                .Take(5)
                .ToList();

            if (allDirectMatches.Any())
            {
                // Best (top-ranked) route — for backward compatibility
                var best = allDirectMatches.First();

                // Build all options list
                var directOptions = allDirectMatches.Select(x => new BusOption
                {
                    RouteNo = x.Route.RouteNo,
                    Fare = Math.Round(x.Fare!.Value, 0),
                    Via = x.Route.Via,
                    From = x.Route.From,
                    To = x.Route.To
                }).ToList();

                var bestDirectResult = new BusFareResult
                {
                    Found = true,
                    IsMultiLeg = false,
                    IsPrincipal = best.Route.IsPrincipal,
                    IsApproximateFare = best.IsApproximate,
                    RouteNo = best.Route.RouteNo,
                    Via = best.Route.Via,
                    Fare = Math.Round(best.Fare!.Value, 2),
                    From = best.Route.From,
                    To = best.Route.To,
                    DirectOptions = directOptions
                };

                return bestDirectResult;
            }

            //2-Leg Interchange (only runs if no direct route matched)
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
                        .Select(r => new { Route = r, Fare = GetFare(r, interchange, to, _cachedFareLookup, out bool _) })
                        .Where(x => x.Fare.HasValue)
                        .ToList();

                    if (!validLeg2Candidates.Any()) continue;

                    var fare1 = GetFare(leg1, from, interchange, _cachedFareLookup, out bool _);
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

            if (possibleInterchanges.Any())
            {
                var bestFit = possibleInterchanges
                    .OrderBy(x => x.Total)
                    .First();

                return new BusFareResult
                {
                    Found = true,
                    IsMultiLeg = true,
                    RouteNo1 = bestFit.Leg1.RouteNo,
                    Interchange = bestFit.Interchange,
                    RouteNo2 = bestFit.Leg2.RouteNo,
                    FareLeg1 = Math.Round(bestFit.Fare1, 2),
                    FareLeg2 = Math.Round(bestFit.Fare2, 2),
                    TotalFare = Math.Round(bestFit.Total, 2),
                    ViaLeg1 = bestFit.Leg1.Via,
                    ViaLeg2 = bestFit.Leg2.Via,
                    From1 = bestFit.Leg1.From,
                    To1 = bestFit.Leg1.To,
                    From2 = bestFit.Leg2.From,
                    To2 = bestFit.Leg2.To
                };
            }

            return new BusFareResult { Found = false };
        }
    }
}