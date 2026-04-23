using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransportVehiclesController : ControllerBase
    {
        private readonly AdminService _adminService;

        public TransportVehiclesController(AdminService adminService)
        {
            _adminService = adminService;
        }

        /// <summary>
        /// Updates vehicle info for a provider and sets status to Pending for Admin review.
        /// </summary>
        [HttpPut("update-vehicle/{userId}")]
        public async Task<IActionResult> UpdateVehicle(string userId, [FromBody] User vehicleInfo)
        {
            try 
            {
                // Force status to Pending to trigger the Admin Dashboard loop
                vehicleInfo.Status = "Pending";
                vehicleInfo.UserType = "Provider";

                await _adminService.UpdateUserVehicleAsync(userId, vehicleInfo);
                
                return Ok(new { message = "Vehicle submitted for Admin approval!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to submit vehicle", error = ex.Message });
            }
        }

        /// <summary>
        /// GET: api/TransportVehicles
        /// Fetches only the providers that have been APPROVED by the Admin.
        /// </summary>
        [HttpGet] 
        public async Task<List<User>> GetAvailableVehicles()
        {
            // This calls the service method that filters by UserType='Provider' and Status='Approved'
            return await _adminService.GetApprovedProvidersAsync();
        }
    }
}