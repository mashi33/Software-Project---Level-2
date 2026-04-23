using Microsoft.AspNetCore.Mvc;
using SmartJourney.Api.Services;
using System.Threading.Tasks;

namespace SmartJourney.Api.Controllers
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

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats() => Ok(await _dashboardService.GetDashboardStats());

        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles() => Ok(await _dashboardService.GetAllVehicles());

        [HttpDelete("vehicles/{id}")]
        public async Task<IActionResult> DeleteVehicle(string id)
        {
            await _dashboardService.DeleteVehicle(id);
            return NoContent();
        }

        [HttpPut("vehicles/{id}/availability")]
        public async Task<IActionResult> UpdateAvailability(string id, [FromBody] bool available)
        {
            await _dashboardService.UpdateVehicleAvailability(id, "Available");
            return Ok();
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetBookings() => Ok(await _dashboardService.GetAllBookings());

        [HttpDelete("bookings/{id}")]
        public async Task<IActionResult> DeleteBooking(string id)
        {
            await _dashboardService.DeleteBooking(id);
            return NoContent();
        }
    }
}