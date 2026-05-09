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
        public async Task<IActionResult> GetStats() 
            => Ok(await _dashboardService.GetDashboardStats());

        // Provides full vehicle list for fleet management UI
        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles() 
            => Ok(await _dashboardService.GetAllVehicles());

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