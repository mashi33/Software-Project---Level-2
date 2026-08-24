using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Interfaces
{

    /// Defines the contract for the route optimization service.
    public interface IRouteService
    {
        // Returns optimized route options (fastest, cheapest, scenic) for the given request.
        Task<IActionResult> GetOptimizedRoutesAsync(RouteRequest req);

         /*Returns NTC bus fare for the given start and end locations.
         Supports direct and 2-leg interchange routes.*/
        Task<IActionResult> GetBusFareAsync(RouteRequest req);
    }
}