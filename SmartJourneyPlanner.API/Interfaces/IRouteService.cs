using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Interfaces
{
    public interface IRouteService
    {
        Task<IActionResult> GetOptimizedRoutesAsync(RouteRequest req);
    }
}
