using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Interfaces
{
    /// <summary>
    /// Defines the contract for the route optimization service.
    /// </summary>
    public interface IRouteService
    {
        /// <summary>
        /// Returns optimized route options (fastest, cheapest, scenic) for the given request.
        /// </summary>
        Task<IActionResult> GetOptimizedRoutesAsync(RouteRequest req);

        /// <summary>
        /// Returns NTC bus fare for the given start and end locations.
        /// Supports direct and 2-leg interchange routes.
        /// </summary>
        Task<IActionResult> GetBusFareAsync(RouteRequest req);
    }
}