using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers
{
[ApiController]
[Route("api/weather")] 
public class WeatherController : ControllerBase
{
    private readonly WeatherSuggestionService _service;

    public WeatherController(WeatherSuggestionService service) => _service = service;

    [HttpGet("suggestions")]
    public IActionResult GetSuggestion(double temp, double humidity, string condition)
    {
        // Delegates business logic to service layer to keep controller lightweight and testable
        var result = _service.GenerateSuggestion(temp, humidity, condition);

        if (result == null || string.IsNullOrEmpty(result.Message))
        {
            return NotFound("No suggestion generated.");
        }
        // Standard REST response when valid recommendation data is produced
        return Ok(result);
    }
}
}