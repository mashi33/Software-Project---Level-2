using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Interfaces;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
#nullable disable
    
    // API controller that exposes route optimization endpoints.
    [ApiController]
    [Route("api/routes")]
    public class RouteController : ControllerBase
    {
        private readonly IRouteService _routeService;
        private readonly BusFareService _busFareService;

        // Injects the route service via dependency injection.
        public RouteController(IRouteService routeService, BusFareService busFareService)
        {
            _routeService = routeService;
            _busFareService = busFareService;
        }

        // Accepts a start and end location, then returns fastest, cheapest, and scenic route options.
        [HttpPost("optimize")]
        public async Task<IActionResult> GetOptimizedRoutes([FromBody] RouteRequest req)
        {
            return await _routeService.GetOptimizedRoutesAsync(req);
        }

        // Accepts a start and end location, then returns NTC bus fare details.
        [HttpPost("bus-fare")]
        public async Task<IActionResult> GetBusFare([FromBody] RouteRequest req)
        {
            return await _routeService.GetBusFareAsync(req);
        }

        [HttpPost("add-route")]
        public async Task<IActionResult> AddRoute([FromBody] BusRoute route)
        {
            // Clear cache when a new route is added, so the next request reloads with updated data.
            _busFareService.ClearCache();
            return Ok(new { Message = "Route added and cache cleared successfully!" });
        }
    }
}