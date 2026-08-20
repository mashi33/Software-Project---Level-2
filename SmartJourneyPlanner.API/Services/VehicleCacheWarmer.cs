using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Caching.Memory;
using System.Threading;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.API.Services
{
    /**
     * 🚀 Background Cache Warmer:
     * Pre-loads the approved transport vehicles into RAM memory when the API server starts up.
     * This eliminates the initial "cold start" delay so the first page load is instant (<10ms)!
     */
    public class VehicleCacheWarmer : BackgroundService
    {
        private readonly AdminService _adminService;
        private readonly IMemoryCache _cache;
        private const string ApprovedVehiclesCacheKey = "ApprovedVehicles_List_Cache";

        public VehicleCacheWarmer(AdminService adminService, IMemoryCache cache)
        {
            _adminService = adminService;
            _cache = cache;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Allow server to initialize completely for 1 second
            await Task.Delay(1000, stoppingToken);

            try
            {
                Console.WriteLine("[Cache Warmer] ⚡ Pre-warming Transport Vehicles Cache in background...");
                var activeVehicles = await _adminService.GetApprovedProvidersAsync();

                if (activeVehicles != null && activeVehicles.Count > 0)
                {
                    var cacheOptions = new MemoryCacheEntryOptions()
                        .SetAbsoluteExpiration(TimeSpan.FromHours(24))
                        .SetSlidingExpiration(TimeSpan.FromHours(12));

                    _cache.Set(ApprovedVehiclesCacheKey, activeVehicles, cacheOptions);

                    // Also pre-cache individual vehicle details
                    foreach (var v in activeVehicles)
                    {
                        if (!string.IsNullOrEmpty(v.Id))
                        {
                            _cache.Set($"Vehicle_Detail_{v.Id}", v, cacheOptions);
                        }
                    }

                    Console.WriteLine($"[Cache Warmer] ✅ Pre-warmed {activeVehicles.Count} vehicles in RAM! First load will be instant.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Cache Warmer] Warning: {ex.Message}");
            }
        }
    }
}
