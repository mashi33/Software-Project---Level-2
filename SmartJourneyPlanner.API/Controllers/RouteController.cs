using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Interfaces;

namespace SmartJourneyPlanner.Controllers
{
#nullable disable
    [ApiController]
    [Route("api/routes")]
    public class RouteController : ControllerBase
    {
        private readonly IRouteService _routeService;

        public RouteController(IRouteService routeService)
        {
            _routeService = routeService;
        }

        [HttpPost("optimize")]
        public async Task<IActionResult> GetOptimizedRoutes([FromBody] RouteRequest req)
        {
            return await _routeService.GetOptimizedRoutesAsync(req);
        }
    }
}