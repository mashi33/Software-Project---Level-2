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
    // keep AllowAnonymous for don't get 401 errors
    // While still testing UI buttons, Turn this off for production
    [AllowAnonymous]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoCollection<User> _userCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;

        public AdminController(IMongoClient mongoClient)
        {
            // using direct mongoClient here to save bit of time
            // instead of making a whole new service just for admin tasks
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _userCollection = database.GetCollection<User>("Users");
            _vehicleCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // --- 📊 NEW DASHBOARD METRICS GATEWAY ---
        
        /**
         * GET: /api/Admin/dashboard-stats
         * 🔑 FIXED: Calculates pending counters straight from your vehicle collection
         * so the Admin Home Center numbers dynamically match real form submissions!
         */
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            // 1. Calculate how many platform log-in accounts exist
            var totalUsers = await _userCollection.CountDocumentsAsync(_ => true);

            // 2. Count vehicles that are waiting under either pending status variation string
            var pendingVehicles = await _vehicleCollection.CountDocumentsAsync(v => 
                v.Status == "Pending" || v.Status == "Pending Approval");

            return Ok(new 
            { 
                pendingProvidersCount = pendingVehicles, // Updates your UI metric summary card
                platformUsers = totalUsers 
            });
        }

        // --- 👥 DASHBOARD HOME & USERS ---
        
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

        // --- 🚐 MANAGE PROVIDERS ---
        
        /**
         * GET: /api/Admin/pending-providers
         * 🔑 FIXED: Uses a dual-filter condition array lookup matching both "Pending" and "Pending Approval"
         * strings so unapproved vehicles show up inside the Admin Panel requests view table!
         */
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            var pendingFilter = Builders<TransportVehicle>.Filter.Or(
                Builders<TransportVehicle>.Filter.Eq(v => v.Status, "Pending"),
                Builders<TransportVehicle>.Filter.Eq(v => v.Status, "Pending Approval")
            );

            var pending = await _vehicleCollection.Find(pendingFilter).ToListAsync();
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