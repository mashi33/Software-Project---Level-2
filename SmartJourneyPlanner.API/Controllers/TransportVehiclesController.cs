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
    /// <summary>
    /// This controller manages the API endpoints for transport vehicles.
    /// It communicates between the Angular frontend and the MongoDB database.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TransportVehiclesController : ControllerBase
    {
        private readonly AdminService _adminService;
        private readonly TransportVehicleService _vehicleService;

        public TransportVehiclesController(AdminService adminService, TransportVehicleService vehicleService)
        {
            _adminService = adminService;
            _vehicleService = vehicleService;
        }

        // --- 🌍 PUBLIC VIEW (Travelers) ---

        /**
         * GET: api/TransportVehicles
         * Returns a list of all vehicles that have been approved by the Admin.
         */
        [HttpGet] 
        public async Task<IActionResult> GetAvailableVehicles()
        {
            var approved = await _adminService.GetApprovedProvidersAsync();
            return Ok(approved);
        }

        // --- 🚐 PROVIDER ACTIONS ---

        /**
         * POST: api/TransportVehicles
         * Takes vehicle information from the frontend and saves it to the database.
         * The vehicle starts with a "Pending" status until an Admin approves it.
         */
        [HttpPost]
        public async Task<IActionResult> CreateVehicle([FromBody] TransportVehicle vehicleInfo)
        {
            try 
            {
                // ✅ FORCE LOGIC: Every new vehicle starts as Pending and Unverified
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
         * GET: api/TransportVehicles/my-vehicles/{providerId}
         * Allows a provider to see their specific fleet and their approval status.
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
         * POST: api/TransportVehicles/seed
         * Clears the current vehicles and inserts a list of pre-defined sample vehicles.
         * Used for testing and demonstration.
         */
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromBody] List<TransportVehicle> vehicles)
        {
            if (vehicles == null || !vehicles.Any()) return BadRequest();
            
            await _vehicleService.DeleteAllAsync();
            
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
         * DELETE: api/TransportVehicles/clear
         * Deletes every single vehicle from the database.
         */
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearAll()
        {
            await _vehicleService.DeleteAllAsync();
            return Ok(new { message = "All vehicles cleared successfully!" });
        }

        /**
         * GET: api/TransportVehicles/{id}
         * Finds and returns the full details of a specific vehicle using its database ID.
         */
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();
            return vehicle;
        }

        /**
         * DELETE: api/TransportVehicles/{id}
         * Deletes one specific vehicle record from the database.
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
         * POST: api/TransportVehicles/{id}/reviews
         * Receives a customer's review (stars and text) and adds it to the vehicle's history.
         */
        [HttpPost("{id}/reviews")]
        public async Task<IActionResult> AddReview(string id, [FromBody] TransportReview review)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) 
            {
                return NotFound(new { message = $"Vehicle with ID {id} not found." });
            }

            if (string.IsNullOrEmpty(review.Date))
            {
                review.Date = DateTime.UtcNow.ToString("yyyy-MM-dd");
            }

            await _vehicleService.AddReviewAsync(id, review);
            return Ok(new { message = "Review added successfully" });
        }
    }
}