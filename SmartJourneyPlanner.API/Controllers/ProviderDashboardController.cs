using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProviderDashboardController : ControllerBase
    {
        private readonly ProviderDashboardService _dashboardService;

        public ProviderDashboardController(ProviderDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

       // Returns aggregated metrics used for dashboard summary cards (KPIs)
        [HttpGet("stats")]
[Microsoft.AspNetCore.Authorization.Authorize] // 🌟 Secure the endpoint
public async Task<IActionResult> GetStats() 
{
    // 🌟 Extract the dynamic provider email/username identifier from the token claims
    var providerIdentifier = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                             ?? User.FindFirst("email")?.Value
                             ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                             ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

    if (string.IsNullOrEmpty(providerIdentifier)) return Unauthorized();

    // 🌟 Pass the identifier into your service calculation method
    return Ok(await _dashboardService.GetDashboardStats(providerIdentifier));
}

        // Provides full vehicle list for fleet management UI
        // Provides full vehicle list for fleet management UI
        [HttpGet("vehicles")]
        [Microsoft.AspNetCore.Authorization.Authorize] 
        public async Task<IActionResult> GetVehicles() 
        {
            // 🔎 Checks every standard claim path variation to guarantee we grab the right string
            var providerIdentifier = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                                     ?? User.FindFirst("email")?.Value
                                     ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                                     ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            // Log this to your backend console terminal window so you can see the string value!
            System.Console.WriteLine($"⚙️ Active Authenticated Provider Token ID extracted: '{providerIdentifier}'");

            if (string.IsNullOrEmpty(providerIdentifier)) return Unauthorized();

            return Ok(await _dashboardService.GetAllVehicles(providerIdentifier));
        }

        [HttpPut("vehicles/{id}/availability")]
        public async Task<IActionResult> UpdateAvailability(string id, [FromBody] bool available)
        {
            await _dashboardService.UpdateVehicleAvailability(id,available ? "Available" : "Unavailable");
            return Ok();
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetBookings() 
            => Ok(await _dashboardService.GetAllBookings());

        [HttpPut("bookings/{id}/complete")]
        public async Task<IActionResult> CompleteBooking(string id)
        {
            var success = await _dashboardService.UpdateBookingStatus(id, "Completed");
            
            if (!success) return NotFound();
            
            return NoContent();
        }

        [HttpDelete("bookings/{id}")]
        public async Task<IActionResult> RejectBooking(string id)
        {
            await _dashboardService.DeleteBooking(id);
            return NoContent();
        }
    }
}