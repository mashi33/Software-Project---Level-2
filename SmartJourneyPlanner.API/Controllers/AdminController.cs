using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.Models; 
using SmartJourneyPlanner.API.Models; 
using SmartJourneyPlanner.API.Services; 
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.API.Controllers
{
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

        // --- 1. & 3. User Management & Stats ---
        [HttpGet("all-users")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userCollection.Find(_ => true).ToListAsync();
            return Ok(users);
        }

        [HttpPut("promote-user/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> PromoteUser(string id, [FromBody] string newRole)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.UserType, newRole); 
            await _userCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "User role updated successfully" });
        }

        [HttpPut("toggle-block/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> ToggleBlock(string id, [FromBody] BlockRequest request)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.IsBlocked, request.IsBlocked);
            await _userCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "User status updated successfully" });
        }

        [HttpDelete("delete-user/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userCollection.DeleteOneAsync(u => u.Id == id);
            if (result.DeletedCount == 0) return NotFound();
            return Ok(new { message = "User removed successfully" });
        }

        // --- 2. Manage Providers ---
        [HttpGet("pending-providers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPendingProviders()
        {
            var pending = await _vehicleCollection.Find(v => v.Status == "Pending").ToListAsync();
            return Ok(pending);
        }

        [HttpGet("provider-detail/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
            if (vehicle == null) return NotFound();
            return Ok(vehicle);
        }
    }

    // This class must be here for the ToggleBlock to work
    public class BlockRequest
    {
        public bool IsBlocked { get; set; }
    }
}
