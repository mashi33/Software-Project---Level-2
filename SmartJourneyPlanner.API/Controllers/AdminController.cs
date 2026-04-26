using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;         
using SmartJourneyPlanner.API.Models;    
using SmartJourneyPlanner.API.Services;  
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace SmartJourneyPlanner.API.Controllers
{
    [AllowAnonymous] 
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
                var projection = Builders<TransportVehicle>.Projection
                    .Exclude(v => v.InteriorPhoto).Exclude(v => v.ExteriorPhoto)
                    .Exclude(v => v.DriverLicenseUrl).Exclude(v => v.DriverNicUrl)
                    .Exclude(v => v.RevenueLicenseUrl);

                var pending = await _vehicleCollection.Find(v => v.Status == "Pending")
                    .Project<TransportVehicle>(projection).ToListAsync();
                return Ok(pending); 
            }
            catch (Exception ex) { return BadRequest(new { message = "Error", error = ex.Message }); }
        }

        [HttpGet("provider-detail/{id}")]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
            if (vehicle == null) return NotFound(new { message = "Vehicle not found" });
            return Ok(vehicle);
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

        // --- 👥 USER MANAGEMENT ---

        [HttpGet("all-users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userCollection.Find(_ => true).ToListAsync();
            return Ok(users);
        }

        /// <summary>
        /// ✅ DIRECT STRING VERSION: This accepts a JSON-quoted string like "Admin"
        /// No DTO required, eliminating mapping errors.
        /// </summary>
        [HttpPut("promote-user/{id}")]
        public async Task<IActionResult> PromoteUser(string id, [FromBody] string newRole)
        {
            try
            {
                if (string.IsNullOrEmpty(newRole)) 
                    return BadRequest(new { message = "Role value was empty." });

                var filter = Builders<User>.Filter.Eq(u => u.Id, id);
                var update = Builders<User>.Update.Set(u => u.Role, newRole);
                
                var result = await _userCollection.UpdateOneAsync(filter, update);

                if (result.MatchedCount == 0) return NotFound(new { message = "User not found." });

                return Ok(new { message = $"User promoted to {newRole} successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Internal error", error = ex.Message });
            }
        }

        [HttpDelete("delete-user/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userCollection.DeleteOneAsync(u => u.Id == id);
            if (result.DeletedCount == 0) return NotFound();
            return Ok(new { message = "User removed successfully" });
        }
    }
}