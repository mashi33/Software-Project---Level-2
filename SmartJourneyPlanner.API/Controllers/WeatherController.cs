using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WeatherController : ControllerBase
    {
        private readonly WeatherSuggestionService _weatherService;

        public WeatherController(WeatherSuggestionService weatherService)
        {
            _weatherService = weatherService;
        }

        [HttpGet("suggestions")]
        public IActionResult GetSuggestion([FromQuery] double temp, [FromQuery] string condition)
        {
            var result = _weatherService.GenerateSuggestion(temp, condition);

            if (result == null)
            {
                return NotFound(new { message = $"No rules found for {condition} weather at {temp}°C." });
            }

            return Ok(result);
        }
    }
}