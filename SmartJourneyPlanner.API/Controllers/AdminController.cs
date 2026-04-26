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
    //While still testing UI buttons,Turn this off for production
    [AllowAnonymous]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoCollection<User> _userCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;

        public AdminController(IMongoClient mongoClient)
        {
            //using direct mongoClient here to save bit of time
            //instead of making a whole new service just for admin tasks
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _userCollection = database.GetCollection<User>("Users");
            _vehicleCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // DASHBOARD HOME & USERS
        [HttpGet("all-users")]
        public async Task<IActionResult> GetAllUsers()
        {
            //Pulling everything so I can do the search bar logic
            // inside Angular without making the user wait for a reload
            var users = await _userCollection.Find(_ => true).ToListAsync();
            return Ok(users);
        }

        [HttpPut("promote-user/{id}")]
        public async Task<IActionResult> PromoteUser(string id, [FromBody] string newRole)
        {
            //Sending a plain string from Angular to [FromBody] is tricky
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
            //Using a separate BlockRequest class because raw booleans in
            //[FromBody] usually cause "400 Bad Request" errors in .NET.
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.IsBlocked, request.IsBlocked);
            
            await _userCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "Status updated" });
        }

        [HttpDelete("delete-user/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            //This is a hard delete. No undo button here.
            var result = await _userCollection.DeleteOneAsync(u => u.Id == id);
            return result.DeletedCount == 0 ? NotFound() : Ok(new { message = "User deleted" });
        }

        // MANAGE PROVIDERS
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            //Only fetch 'Pending' so the dashboard count matches
            //what the admin actually needs to approve
            var pending = await _vehicleCollection.Find(v => v.Status == "Pending").ToListAsync();
            return Ok(pending);
        }

        [HttpGet("provider-detail/{id}")]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            //when someone clicks "Details"
            //It prevents loading huge base64 images into the main list
            var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
            return vehicle == null ? NotFound() : Ok(vehicle);
        }

        [HttpPut("update-status/{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);

            //updating both Status AND IsVerified at once
            //This ensures the transport provider actually shows up in search results
            var update = Builders<TransportVehicle>.Update
                .Set(v => v.Status, newStatus)
                .Set(v => v.IsVerified, newStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase));
            
            await _vehicleCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "Status updated" });
        }
    }

    //helper class to handle the "Block" button logic
    public class BlockRequest 
    { 
        public bool IsBlocked { get; set; } 
    }
}