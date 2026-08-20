using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

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
[Microsoft.AspNetCore.Authorization.Authorize] //  Secure the endpoint
public async Task<IActionResult> GetStats() 
{
    //  Extract the dynamic provider email/username identifier from the token claims
    var providerIdentifier = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                             ?? User.FindFirst("email")?.Value
                             ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                             ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

    if (string.IsNullOrEmpty(providerIdentifier)) return Unauthorized();

    //  Pass the identifier into your service calculation method
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

        // Single endpoint for entire dashboard 
        [HttpGet("full")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> GetFullDashboard()
        {
            var providerIdentifier = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                                     ?? User.FindFirst("email")?.Value
                                     ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                                     ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(providerIdentifier)) return Unauthorized();

            return Ok(await _dashboardService.GetFullDashboard(providerIdentifier));
        }

        [HttpPut("vehicles/{id}/availability")]
        public async Task<IActionResult> UpdateAvailability(string id, [FromBody] bool available)
        {
            await _dashboardService.UpdateVehicleAvailability(id,available ? "Available" : "Unavailable");
            return Ok();
        }

        [HttpGet("bookings")]
[Microsoft.AspNetCore.Authorization.Authorize] //  Ensure authorization claims are bound
public async Task<IActionResult> GetBookings() 
{
    var providerIdentifier = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
                             ?? User.FindFirst("email")?.Value
                             ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                             ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

    if (string.IsNullOrEmpty(providerIdentifier)) return Unauthorized();

    //  Pass the active identifier downstream into your updated service filter query
    return Ok(await _dashboardService.GetAllBookings(providerIdentifier));
}

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

        // Add blocked date range with overlap validation
        [HttpPost("vehicles/{id}/blocked-ranges")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> AddBlockedDateRange(string id, [FromBody] BlockedDateRangeRequest request)
        {
            System.Console.WriteLine($" Controller: AddBlockedDateRange ");
            System.Console.WriteLine($"Vehicle ID: {id}");
            System.Console.WriteLine($"StartDate: {request?.StartDate}");
            System.Console.WriteLine($"EndDate: {request?.EndDate}");
            System.Console.WriteLine($"Reason: {request?.Reason}");
            
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request. Request body is null." });
            }
            
            if (string.IsNullOrEmpty(request.StartDate) || string.IsNullOrEmpty(request.EndDate))
            {
                return BadRequest(new { message = "StartDate and EndDate are required." });
            }
            
            var result = await _dashboardService.AddBlockedDateRange(
                id, request.StartDate, request.EndDate, request.Reason);

           if (!result.Success)
                return BadRequest(new { message = result.Message });

                return Ok(new   
           {
                 message = result.Message,
                 id = result.Id
           });
        }

        // Edit blocked date range with overlap validation
        [HttpPut("vehicles/{id}/blocked-ranges/{rangeId}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> EditBlockedDateRange(string id, string rangeId, [FromBody] BlockedDateRangeRequest request)
        {
            System.Console.WriteLine($" Controller: EditBlockedDateRange ");
            System.Console.WriteLine($"Vehicle ID: {id}");
            System.Console.WriteLine($"Range ID: {rangeId}");
            System.Console.WriteLine($"StartDate: {request?.StartDate}");
            System.Console.WriteLine($"EndDate: {request?.EndDate}");
            System.Console.WriteLine($"Reason: {request?.Reason}");
            
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request. Request body is null." });
            }
            
            if (string.IsNullOrEmpty(request.StartDate) || string.IsNullOrEmpty(request.EndDate))
            {
                return BadRequest(new { message = "StartDate and EndDate are required." });
            }
            
            var result = await _dashboardService.EditBlockedDateRange(id, rangeId, request.StartDate, request.EndDate, request.Reason);
            if (!result.Success) return BadRequest(new { message = result.Message });
            return Ok(new { message = "Blocked date range updated successfully" });
        }

        // Delete blocked date range
        [HttpDelete("vehicles/{id}/blocked-ranges/{rangeId}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> DeleteBlockedDateRange(string id, string rangeId)
        {
            System.Console.WriteLine($" Controller: DeleteBlockedDateRange ");
            System.Console.WriteLine($"Vehicle ID: {id}");
            System.Console.WriteLine($"Range ID: {rangeId}");
            
            var result = await _dashboardService.DeleteBlockedDateRange(id, rangeId);
            if (!result.Success) return BadRequest(new { message = result.Message });
            return Ok(new { message = "Blocked date range deleted successfully" });
        }

        // Get all blocked date ranges for a vehicle
        [HttpGet("vehicles/{id}/blocked-ranges")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> GetBlockedDateRanges(string id)
        {
            var ranges = await _dashboardService.GetBlockedDateRanges(id);
            return Ok(ranges);
        }
    }

    // DTO for blocked date range requests
    public class BlockedDateRangeRequest
    {
        [JsonPropertyName("startDate")]
        public string StartDate { get; set; } = string.Empty;

        [JsonPropertyName("endDate")]
        public string EndDate { get; set; } = string.Empty;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    // Result wrapper for service operations
    public class ServiceResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}