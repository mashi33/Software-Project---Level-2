using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using MongoDB.Bson;

namespace SmartJourneyPlanner.Controllers
{
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

        // GET: api/TransportVehicles - Get all vehicles that admin has approved
        [HttpGet] 
        public async Task<IActionResult> GetAvailableVehicles()
        {
            var approved = await _adminService.GetApprovedProvidersAsync();
            return Ok(approved);
        }

        // POST: api/TransportVehicles - Register a new vehicle and wait for admin approval
        [HttpPost]
        public async Task<IActionResult> CreateVehicle([FromBody] TransportVehicle vehicleInfo)
        {
            try 
            {
                vehicleInfo.Status = "Pending";
                if (string.IsNullOrEmpty(vehicleInfo.Id)) vehicleInfo.Id = null;

                await _vehicleService.CreateAsync(vehicleInfo);
                return Ok(new { message = "Vehicle listing submitted for Admin approval!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to submit vehicle", error = ex.Message });
            }
        }

        // POST: api/TransportVehicles/seed - Fill the database with sample vehicle data
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromBody] List<TransportVehicle> vehicles)
        {
            if (vehicles == null || !vehicles.Any()) return BadRequest();
            
            await _vehicleService.DeleteAllAsync();
            
            var vehiclesToInsert = vehicles.Select(v => { 
                v.Id = null; 
                v.Status = "Approved"; 
                return v; 
            }).ToList();

            await _vehicleService.InsertManyAsync(vehiclesToInsert);
            return Ok(new { message = "Seeded successfully" });
        }

        // GET: api/TransportVehicles/{id} - Get details of one specific vehicle
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();
            return vehicle;
        }

        // DELETE: api/TransportVehicles/{id} - Remove a vehicle from the system
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            await _vehicleService.RemoveAsync(id);
            return NoContent();
        }

        // POST: api/TransportVehicles/{id}/reviews - Add a new customer rating and comment
        [HttpPost("{id}/reviews")]
        public async Task<IActionResult> AddReview(string id, [FromBody] TransportReview review)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) 
            {
                return NotFound(new { message = $"Vehicle with ID {id} not found." });
            }

            // Set current date if it is not provided
            if (string.IsNullOrEmpty(review.Date))
            {
                review.Date = DateTime.UtcNow.ToString("yyyy-MM-dd");
            }

            // Save the review to the database
            await _vehicleService.AddReviewAsync(id, review);
            return Ok(new { message = "Review added successfully" });
        }
    }
}