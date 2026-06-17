/**
 * This controller manages the API for Transport Vehicles.
 * It allows providers to list their vehicles and travelers to view them.
 */

using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using MongoDB.Bson;
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

        // Constructor connects to the needed services
        public TransportVehiclesController(AdminService adminService, TransportVehicleService vehicleService)
        {
            _adminService = adminService;
            _vehicleService = vehicleService;
        }

        // --- 🌍 PUBLIC VIEW (For Travelers) ---

        /**
         * GET: /api/TransportVehicles
         * Returns a list of all vehicles that are verified AND toggled to "Available".
         */
        [HttpGet] 
        public async Task<IActionResult> GetAvailableVehicles()
        {
            // 🔑 Hits our newly updated service rule to filter out "Unavailable" items
            var activeVehicles = await _adminService.GetApprovedProvidersAsync();
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
                vehicleInfo.Status = "Pending Approval"; 
                vehicleInfo.IsVerified = false;

                if (string.IsNullOrEmpty(vehicleInfo.Id)) vehicleInfo.Id = null;

                await _vehicleService.CreateAsync(vehicleInfo);
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
                    .Where(v => !string.IsNullOrEmpty(v.Status) && 
                                !v.Status.Equals("Pending Approval", StringComparison.OrdinalIgnoreCase) &&
                                !v.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
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
                v.Status = "Approved"; 
                v.IsVerified = true;
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
         */
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
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
            return NoContent();
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
            return Ok(new { message = "Review added successfully" });
        }
    }
}