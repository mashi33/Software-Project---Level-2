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
         * Returns a list of all vehicles that have been approved by the Admin.
         * Travelers use this to search for available transport.
         */
        [HttpGet] 
        public async Task<IActionResult> GetAvailableVehicles()
        {
            var approved = await _adminService.GetApprovedProvidersAsync();
            return Ok(approved);
        }

        // --- 🚐 PROVIDER ACTIONS ---

        /**
         * POST: /api/TransportVehicles
         * Saves a new vehicle to the database.
         * IMPORTANT: New vehicles start as "Pending" and "Unverified" 
         * until an Admin reviews and approves them.
         */
        [HttpPost]
        public async Task<IActionResult> CreateVehicle([FromBody] TransportVehicle vehicleInfo)
        {
            try 
            {
                // Force new vehicles to be Pending for security
                vehicleInfo.Status = "Pending";
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
         * Returns only the vehicles belonging to a specific provider.
         * Used in the provider's dashboard.
         */
        [HttpGet("my-vehicles/{providerId}")]
        public async Task<IActionResult> GetMyVehicles(string providerId)
        {
            try
            {
                var myVehicles = await _vehicleService.GetByProviderIdAsync(providerId);
                return Ok(myVehicles);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching your vehicles", error = ex.Message });
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