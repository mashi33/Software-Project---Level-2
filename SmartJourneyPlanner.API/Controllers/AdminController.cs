using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;         // For TransportVehicle
using SmartJourneyPlanner.API.Models;    // For User
using SmartJourneyPlanner.API.Services;  // For AdminService
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace SmartJourneyPlanner.API.Controllers
{
    [AllowAnonymous] // ⚠️ For testing only: allow access without login
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _adminService;
        private readonly IMongoCollection<User> _userCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;

        public AdminController(AdminService adminService, IMongoClient mongoClient)
        {
            _adminService = adminService;
            
            // Connect to the database collections
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _userCollection = database.GetCollection<User>("Users");
            _vehicleCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // --- 🚐 TRANSPORT PROVIDER APPROVALS ---

        /// <summary>
        /// Fetches vehicles with 'Pending' status.
        /// Optimized with projections to exclude heavy Base64 images for fast loading.
        /// </summary>
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            try 
            {
                // 🚀 OPTIMIZATION: Exclude massive image fields to avoid "Message too large" exceptions
                var projection = Builders<TransportVehicle>.Projection
                    .Exclude(v => v.InteriorPhoto)
                    .Exclude(v => v.ExteriorPhoto)
                    .Exclude(v => v.DriverLicenseUrl)
                    .Exclude(v => v.DriverNicUrl)
                    .Exclude(v => v.RevenueLicenseUrl);

                var pending = await _vehicleCollection
                    .Find(v => v.Status == "Pending")
                    .Project<TransportVehicle>(projection) 
                    .ToListAsync();

                return Ok(pending); 
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching providers", error = ex.Message });
            }
        }

        /// <summary>
        /// Fetches the full vehicle document including images.
        /// Used by the modal details view on-demand.
        /// </summary>
        [HttpGet("provider-detail/{id}")]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            try
            {
                var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
                if (vehicle == null) return NotFound(new { message = "Vehicle detail not found" });
                return Ok(vehicle);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching details", error = ex.Message });
            }
        }

        [HttpPut("update-status/{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string newStatus)
        {
            try
            {
                var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
                
                // Logic: If Approved, set IsVerified to true. Case-insensitive comparison.
                var update = Builders<TransportVehicle>.Update
                    .Set(v => v.Status, newStatus)
                    .Set(v => v.IsVerified, newStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase));

                var result = await _vehicleCollection.UpdateOneAsync(filter, update);

                if (result.MatchedCount == 0) return NotFound(new { message = "Vehicle not found" });

                return Ok(new { message = "Status updated to " + newStatus });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to update status", error = ex.Message });
            }
        }

        [HttpGet("provider-fleet/{providerId}")]
        public async Task<IActionResult> GetProviderFleet(string providerId)
        {
            try
            {
                var fleet = await _adminService.GetByProviderIdAsync(providerId);
                return Ok(fleet);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching provider fleet", error = ex.Message });
            }
        }

        // --- 👥 USER MANAGEMENT ---

        [HttpGet("all-users")]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var users = await _userCollection.Find(_ => true).ToListAsync();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching users", error = ex.Message });
            }
        }

[HttpPut("promote-user/{id}")]
public async Task<IActionResult> PromoteUser([FromRoute] string id, [FromBody] string newRole)
{
    try
    {
        // If the payload is malformed, newRole will be null here
        if (string.IsNullOrEmpty(newRole)) 
            return BadRequest(new { message = "Role is empty. Payload was likely not valid JSON." });

        var filter = Builders<User>.Filter.Eq(u => u.Id, id);
        var update = Builders<User>.Update.Set(u => u.Role, newRole);
        
        var result = await _userCollection.UpdateOneAsync(filter, update);

        if (result.MatchedCount == 0) 
            return NotFound(new { message = "User not found." });

        return Ok(new { message = $"User promoted to {newRole}" });
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = "Update failed", error = ex.Message });
    }
}

// --- 🛠️ DEBUGGING ---

[HttpGet("debug-pending")]
public async Task<IActionResult> DebugPending()
{
    // Raw Bson check for troubleshooting
    var docs = await _vehicleCollection.Find(v => v.Status == "Pending")
                                          .Project(new BsonDocument())
                                          .ToListAsync();
    return Ok(docs.Select(d => d.ToString())); 
        }
    }
}