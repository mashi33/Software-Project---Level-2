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

        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            try 
            {
                // Fetches vehicles where status is exactly "Pending"
                var pending = await _vehicleCollection.Find(v => v.Status == "Pending").ToListAsync();
                return Ok(pending); 
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching providers", error = ex.Message });
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
        public async Task<IActionResult> PromoteUser(string id, [FromBody] string newRole)
        {
            try
            {
                var filter = Builders<User>.Filter.Eq(u => u.Id, id);
                var update = Builders<User>.Update.Set(u => u.Role, newRole);
                
                var result = await _userCollection.UpdateOneAsync(filter, update);

                if (result.MatchedCount == 0)
                {
                    return NotFound(new { message = "User not found" });
                }

                return Ok(new { message = "Role successfully updated to " + newRole });
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
            // Raw BsonDocument check to see exactly what is in Atlas
            var docs = await _vehicleCollection.Find(v => v.Status == "Pending")
                                              .Project(new BsonDocument())
                                              .ToListAsync();
            return Ok(docs.Select(d => d.ToString())); 
        }
    }
}