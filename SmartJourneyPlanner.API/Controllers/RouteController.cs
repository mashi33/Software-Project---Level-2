using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Interfaces;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
#nullable disable
    /// <summary>
    /// API controller that exposes route optimization endpoints.
    /// </summary>
    [ApiController]
    [Route("api/routes")]
    public class RouteController : ControllerBase
    {
        private readonly IRouteService _routeService;
        private readonly BusFareService _busFareService;

        /// <summary>
        /// Injects the route service via dependency injection.
        /// </summary>
        public RouteController(IRouteService routeService, BusFareService busFareService)
        {
            _routeService = routeService;
            _busFareService = busFareService;
        }

        /// <summary>
        /// Accepts a start and end location, then returns fastest, cheapest, and scenic route options.
        /// </summary>
        [HttpPost("optimize")]
        public async Task<IActionResult> GetOptimizedRoutes([FromBody] RouteRequest req)
        {
            return await _routeService.GetOptimizedRoutesAsync(req);
        }

         /// <summary>
        /// Accepts a start and end location, then returns NTC bus fare details.
        /// Used by: Public transport mode.
        /// </summary>
        [HttpPost("bus-fare")]
        public async Task<IActionResult> GetBusFare([FromBody] RouteRequest req)
        {
            return await _routeService.GetBusFareAsync(req);
        }

        [HttpPost("add-route")]
        public async Task<IActionResult> AddRoute([FromBody] BusRoute route)
        {
            // 1. new route is added to the database (MongoDB) 
            // await _busRoutes.InsertOneAsync(route);

            // 2. ⚡ chache clear when a new route is added, so that the next request will reload the cache with updated data.
            _busFareService.ClearCache();

            return Ok(new { Message = "Route added and cache cleared successfully!" });
        }
    }
}