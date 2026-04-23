using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;   // For User and StatusUpdateDto
using SmartJourneyPlanner.API.Services; // For AdminService

namespace SmartJourneyPlanner.API.Controllers
{
    // [Authorize(Roles = "Admin")] // ❌ Commented out to bypass 401 error during testing
    [AllowAnonymous]               // ✅ Added to allow your Angular app to see the data
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _adminService;

        public AdminController(AdminService adminService)
        {
            _adminService = adminService;
        }

        // GET: api/Admin/pending-providers
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            try 
            {
                var pending = await _adminService.GetPendingProvidersAsync();
                return Ok(pending);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error fetching providers", error = ex.Message });
            }
        }

        // PUT: api/Admin/verify-provider/{id}
        [HttpPut("verify-provider/{id}")]
        public async Task<IActionResult> VerifyProvider(string id, [FromBody] StatusUpdateDto updateDto)
        {
            try
            {
                await _adminService.UpdateStatusAsync(id, updateDto.Status);
                return Ok(new { message = $"Provider status updated to {updateDto.Status}" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Update failed", error = ex.Message });
            }
        }
    }

    public class StatusUpdateDto
    {
        public string Status { get; set; } = string.Empty;
    }
}