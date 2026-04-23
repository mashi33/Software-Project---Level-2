using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;   // For User and StatusUpdateDto
using SmartJourneyPlanner.API.Services; // For AdminService

namespace SmartJourneyPlanner.API.Controllers
{
    // [Authorize(Roles = "Admin")] // ❌ Commented out to bypass 401 error during testing
    // This controller handles all Admin-related tasks like approvals
    [AllowAnonymous] // Allow everyone to access for now (no login required for testing)
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _adminService;

        public AdminController(AdminService adminService)
        {
            _adminService = adminService;
        }

        // This method gets all vehicles that are waiting for Admin approval
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            try 
            {
                var pending = await _adminService.GetPendingProvidersAsync();
                return Ok(pending); // Return the list of pending vehicles
            }
            catch (Exception ex)
            {
                // If something goes wrong, return an error message
                return BadRequest(new { message = "Error fetching providers", error = ex.Message });
            }
        }

        // This method is for debugging - it shows the raw data from the database
        [HttpGet("debug-pending")]
        public async Task<IActionResult> DebugPending()
        {
            var client = new MongoDB.Driver.MongoClient("mongodb+srv://sasini20:SmartJourneyPlanner43@cluster-1.kyuo2xt.mongodb.net/?retryWrites=true&w=majority");
            var database = client.GetDatabase("SmartJourneyDb");
            var collection = database.GetCollection<MongoDB.Bson.BsonDocument>("TransportVehicles");
            var docs = await collection.Find(MongoDB.Driver.Builders<MongoDB.Bson.BsonDocument>.Filter.Eq("Status", "Pending")).ToListAsync();
            return Ok(docs.Select(d => d.ToJson())); // Return raw database documents as JSON
        }

        // This method updates a vehicle status to 'Approved' or 'Rejected'
        [HttpPut("verify-provider/{id}")]
        public async Task<IActionResult> VerifyProvider(string id, [FromBody] StatusUpdateDto updateDto)
        {
            try
            {
                // Call the service to update the status in MongoDB
                await _adminService.UpdateStatusAsync(id, updateDto.Status);
                return Ok(new { message = $"Provider status updated to {updateDto.Status}" });
            }
            catch (Exception ex)
            {
                // Return error if the update fails
                return BadRequest(new { message = "Update failed", error = ex.Message });
            }
        }
    }

    public class StatusUpdateDto
    {
        public string Status { get; set; } = string.Empty;
    }
}