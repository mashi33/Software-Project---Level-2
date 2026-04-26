using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.API.Controllers
{
    [AllowAnonymous]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoCollection<User> _userCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;

        public AdminController(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _userCollection = database.GetCollection<User>("Users");
            _vehicleCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // --- 1. & 3. DASHBOARD HOME & USERS ---
        [HttpGet("all-users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userCollection.Find(_ => true).ToListAsync();
            return Ok(users);
        }

        [HttpPut("promote-user/{id}")]
        public async Task<IActionResult> PromoteUser(string id, [FromBody] string newRole)
        {
            if (string.IsNullOrEmpty(newRole))
                return BadRequest(new { message = "Role is required" });

            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.UserType, newRole);
            
            var result = await _userCollection.UpdateOneAsync(filter, update);
            return result.MatchedCount == 0 ? NotFound() : Ok(new { message = "Role updated" });
        }

        [HttpPut("toggle-block/{id}")]
        public async Task<IActionResult> ToggleBlock(string id, [FromBody] BlockRequest request)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.IsBlocked, request.IsBlocked);
            
            await _userCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "Status updated" });
        }

        [HttpDelete("delete-user/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userCollection.DeleteOneAsync(u => u.Id == id);
            return result.DeletedCount == 0 ? NotFound() : Ok(new { message = "User deleted" });
        }

        // --- 2. MANAGE PROVIDERS ---
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            var pending = await _vehicleCollection.Find(v => v.Status == "Pending").ToListAsync();
            return Ok(pending);
        }

        [HttpGet("provider-detail/{id}")]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
            return vehicle == null ? NotFound() : Ok(vehicle);
        }

        [HttpPut("update-status/{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            var update = Builders<TransportVehicle>.Update
                .Set(v => v.Status, newStatus)
                .Set(v => v.IsVerified, newStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase));
            
            await _vehicleCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "Status updated" });
        }
    }

    public class BlockRequest 
    { 
        public bool IsBlocked { get; set; } 
    }
}