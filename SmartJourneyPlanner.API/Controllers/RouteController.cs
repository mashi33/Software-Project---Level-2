using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Interfaces;

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

        /// <summary>
        /// Injects the route service via dependency injection.
        /// </summary>
        public RouteController(IRouteService routeService)
        {
            _routeService = routeService;
        }

        /// <summary>
        /// Accepts a start and end location, then returns fastest, cheapest, and scenic route options.
        /// </summary>
        [HttpPost("optimize")]
        public async Task<IActionResult> GetOptimizedRoutes([FromBody] RouteRequest req)
        {
            return await _routeService.GetOptimizedRoutesAsync(req);
        }
    }
}