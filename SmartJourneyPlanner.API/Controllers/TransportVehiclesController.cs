/**
 * This controller manages the API for Transport Vehicles.
 * It allows providers to list their vehicles and travelers to view them.
 */

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace SmartJourneyPlanner.Controllers
{
    // API endpoint: /api/TransportVehicles
    [ApiController]
    [Route("api/[controller]")]
    public class TransportVehiclesController : ControllerBase
    {
        private readonly AdminService _adminService;
        private readonly TransportVehicleService _vehicleService;
        private readonly NotificationService _notificationService;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IMemoryCache _cache;
        private const string ApprovedVehiclesCacheKey = "ApprovedVehicles_List_Cache";

        // Constructor connects to the needed services
        public TransportVehiclesController(
            AdminService adminService, 
            TransportVehicleService vehicleService, 
            NotificationService notificationService,
            IHubContext<ChatHub> hubContext,
            IMemoryCache cache)
        {
            _adminService = adminService;
            _vehicleService = vehicleService;
            _notificationService = notificationService;
            _hubContext = hubContext;
            _cache = cache;
        }

        // --- 🌍 PUBLIC VIEW (For Travelers) ---

        /**
         * GET: /api/TransportVehicles
         * Returns a list of all vehicles that are verified AND toggled to "Available".
         * 🚀 Uses IMemoryCache to deliver instant (<10ms) responses without hitting MongoDB on every request.
         */
        [HttpGet] 
        public async Task<IActionResult> GetAvailableVehicles()
        {
            if (!_cache.TryGetValue(ApprovedVehiclesCacheKey, out List<TransportVehicle>? activeVehicles) || activeVehicles == null)
            {
                activeVehicles = await _adminService.GetApprovedProvidersAsync();
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromHours(24))
                    .SetSlidingExpiration(TimeSpan.FromHours(12));
                _cache.Set(ApprovedVehiclesCacheKey, activeVehicles, cacheOptions);
            }
            return Ok(activeVehicles);
        }
        // --- 🚐 PROVIDER ACTIONS ---

        /**
         * POST: /api/TransportVehicles
         * Saves a new vehicle to the database.
         */
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize] // 🛡️ Secures the route and reads incoming user JWT login tokens
        public async Task<IActionResult> CreateVehicle([FromBody] TransportVehicle vehicleInfo)
        {
            try 
            {
                // 🔑 THE TARGET FIX: Extract the logged-in provider's real email from token attributes dynamically
                var loggedInUserEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                                        ?? User.FindFirst("email")?.Value 
                                        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(loggedInUserEmail)) return Unauthorized();

                // Force new vehicles to be Pending and bind directly to this real account identity string
                vehicleInfo.ProviderId = loggedInUserEmail.Trim();
                // Inside your CreateVehicle method, change this line:
                vehicleInfo.AdminVerificationStatus = "Pending"; 
                vehicleInfo.IsAvailableForBooking = false;

                if (string.IsNullOrEmpty(vehicleInfo.Id)) vehicleInfo.Id = null;

                await _vehicleService.CreateAsync(vehicleInfo);
                _cache.Remove(ApprovedVehiclesCacheKey);
                return Ok(new { message = "Vehicle listing submitted for Admin approval!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to submit vehicle", error = ex.Message });
            }
        }

       /**
         * GET: /api/TransportVehicles/my-vehicles/{providerId}
         * Returns only the vehicles belonging to a specific provider that the Admin has approved.
         * Used in the provider's dashboard and secondary management validation lookups.
         */
        [HttpGet("my-vehicles/{providerId}")]
        public async Task<IActionResult> GetMyVehicles(string providerId)
        {
            try
            {
                // 1. Fetch all raw data entries linked to this provider account identifier string
                var rawVehiclesList = await _vehicleService.GetByProviderIdAsync(providerId);
                
                // 🔑 THE FINAL GUARD FILTER: Restrict array elements to EXCLUDE "Pending Approval" or "Pending" items
                var approvedVehiclesOnly = rawVehiclesList
                    .Where(v => !string.IsNullOrEmpty(v.AdminVerificationStatus) && 
                                !v.AdminVerificationStatus.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                    .ToList();
                
                return Ok(approvedVehiclesOnly);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching your verified fleet records.", error = ex.Message });
            }
        }
        // --- 🛠️ MANAGEMENT & SEEDING ---

        /**
         * POST: /api/TransportVehicles/seed
         * Populates the database with sample vehicles for testing.
         */
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromBody] List<TransportVehicle> vehicles)
        {
            if (vehicles == null || !vehicles.Any()) return BadRequest();
            
            // Remove existing data first
            await _vehicleService.DeleteAllAsync();
            
            // Mark sample vehicles as already approved
            var vehiclesToInsert = vehicles.Select(v => { 
                v.Id = null; 
                v.AdminVerificationStatus = "Approved"; 
                v.IsAvailableForBooking = true;
                return v; 
            }).ToList();

            await _vehicleService.InsertManyAsync(vehiclesToInsert);
            return Ok(new { message = "Seeded successfully" });
        }


        /**
         * DELETE: /api/TransportVehicles/clear
         * Wipes all vehicle data from the collection.
         */
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearAll()
        {
            await _vehicleService.DeleteAllAsync();
            return Ok(new { message = "All vehicles cleared successfully!" });
        }

        /**
         * GET: /api/TransportVehicles/{id}
         * Returns full details for one specific vehicle.
         * 🚀 Uses IMemoryCache to deliver instant (<1ms) responses.
         */
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var cacheKey = $"Vehicle_Detail_{id}";
            if (!_cache.TryGetValue(cacheKey, out TransportVehicle? vehicle) || vehicle == null)
            {
                // Check if it's already in the cached approved vehicles list in RAM
                if (_cache.TryGetValue(ApprovedVehiclesCacheKey, out List<TransportVehicle>? approvedList) && approvedList != null)
                {
                    vehicle = approvedList.FirstOrDefault(v => v.Id == id);
                }

                if (vehicle == null)
                {
                    vehicle = await _vehicleService.GetAsync(id);
                }

                if (vehicle != null)
                {
                    var cacheOptions = new MemoryCacheEntryOptions()
                        .SetAbsoluteExpiration(TimeSpan.FromMinutes(5));
                    _cache.Set(cacheKey, vehicle, cacheOptions);
                }
            }

            if (vehicle is null) return NotFound();
            return vehicle;
        }

        /**
         * DELETE: /api/TransportVehicles/{id}
         * Removes a specific vehicle from the database.
         */
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            await _vehicleService.RemoveAsync(id);
            _cache.Remove(ApprovedVehiclesCacheKey);
            return NoContent();
        }

        /**
         * PUT: /api/TransportVehicles/{id}
         * Updates an existing vehicle's information.
         */
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> Update(string id, [FromBody] TransportVehicle updatedVehicle)
        {
            try
            {
                var vehicle = await _vehicleService.GetAsync(id);
                if (vehicle is null) return NotFound(new { message = "Vehicle not found." });

                // Check authorization: make sure the logged-in provider owns this vehicle
                var loggedInUserEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                                        ?? User.FindFirst("email")?.Value 
                                        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(loggedInUserEmail)) return Unauthorized();

                if (!string.Equals(vehicle.ProviderId?.Trim(), loggedInUserEmail.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid();
                }

                // Preserve non-editable fields (id, providerId, reviews, availableDates, bookedDates, maintenanceDates, blockedDateRanges)
                updatedVehicle.Id = vehicle.Id;
                updatedVehicle.ProviderId = vehicle.ProviderId;
                updatedVehicle.Reviews = vehicle.Reviews;
                updatedVehicle.AvailableDates = vehicle.AvailableDates;
                updatedVehicle.BookedDates = vehicle.BookedDates;
                updatedVehicle.MaintenanceDates = vehicle.MaintenanceDates;
                updatedVehicle.BlockedDateRanges = vehicle.BlockedDateRanges;
                
                // Revert status to Pending verification
                updatedVehicle.AdminVerificationStatus = "Pending";
                updatedVehicle.IsAvailableForBooking = false;

                await _vehicleService.UpdateAsync(id, updatedVehicle);
                return Ok(new { message = "Vehicle updated successfully! Sent for Admin verification." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to update vehicle.", error = ex.Message });
            }
        }

        // --- ⭐ REVIEWS ---

        /**
         * POST: /api/TransportVehicles/{id}/reviews
         * Allows a traveler to add a rating and comment for a vehicle after their trip.
         */
        [HttpPost("{id}/reviews")]
        public async Task<IActionResult> AddReview(string id, [FromBody] TransportReview review)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) 
            {
                return NotFound(new { message = $"Vehicle with ID {id} not found." });
            }

            // Default to today's date if not provided
            if (string.IsNullOrEmpty(review.Date))
            {
                review.Date = DateTime.UtcNow.ToString("yyyy-MM-dd");
            }

            await _vehicleService.AddReviewAsync(id, review);

            // 🚀 In-Place Cache Update: Update the cached vehicles in RAM without clearing the whole cache
            if (_cache.TryGetValue(ApprovedVehiclesCacheKey, out List<TransportVehicle>? approvedList) && approvedList != null)
            {
                var cachedVeh = approvedList.FirstOrDefault(v => v.Id == id);
                if (cachedVeh != null)
                {
                    cachedVeh.Reviews ??= new List<TransportReview>();
                    cachedVeh.Reviews.Add(review);
                }
            }

            var singleVehicleCacheKey = $"Vehicle_Detail_{id}";
            if (_cache.TryGetValue(singleVehicleCacheKey, out TransportVehicle? singleCachedVeh) && singleCachedVeh != null)
            {
                singleCachedVeh.Reviews ??= new List<TransportReview>();
                singleCachedVeh.Reviews.Add(review);
            }

            // 🔔 Generate Real-Time Notification for Transport Provider in Background
            _ = Task.Run(async () =>
            {
                try
                {
                    if (!string.IsNullOrEmpty(vehicle.ProviderId))
                    {
                        var reviewerName = !string.IsNullOrWhiteSpace(review.UserName) ? review.UserName : "A traveler";
                        var vehicleName = !string.IsNullOrWhiteSpace(vehicle.ModelName) ? vehicle.ModelName : "your vehicle";
                        
                        var notification = new Notification
                        {
                            UserId = vehicle.ProviderId,
                            Icon = "bi-star-fill",
                            IconColorClass = "icon-gold",
                            Title = $"{reviewerName} gave a {review.Rating}★ rating and review for your vehicle {vehicleName}!",
                            IsRead = false,
                            LinkText = "View Fleet",
                            Route = "/provider-dashboard?panel=fleet"
                        };

                        await _notificationService.CreateNotificationAsync(notification);
                        await _hubContext.Clients.Group(notification.UserId).SendAsync("ReceiveNotification", notification);

                        if (!string.IsNullOrEmpty(vehicle.ProviderId) && vehicle.ProviderId != notification.UserId)
                        {
                            await _hubContext.Clients.Group(vehicle.ProviderId).SendAsync("ReceiveNotification", notification);
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"Error sending review notification: {ex.Message}");
                }
            });

            return Ok(new { message = "Review added successfully" });
        }
    }
}