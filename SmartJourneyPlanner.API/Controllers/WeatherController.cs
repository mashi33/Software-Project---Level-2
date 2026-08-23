using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WeatherController : ControllerBase
    {
        private readonly WeatherSuggestionService _weatherService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WeatherController> _logger;

        public WeatherController(
            WeatherSuggestionService weatherService,
            IHttpClientFactory httpClientFactory,
            ILogger<WeatherController> logger)
        {
            _weatherService = weatherService;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        // GEOCODING + LOCATION VALIDATION 
[HttpGet("geocode")]
public async Task<IActionResult> Geocode([FromQuery] string city)
{
    if (string.IsNullOrWhiteSpace(city))
        return BadRequest(new { message = "City name is required." });

    // Basic validation (letters, spaces, hyphen, apostrophe only)
    if (!System.Text.RegularExpressions.Regex.IsMatch(city.Trim(), @"^[a-zA-Z\s\-'.]+$"))
        return BadRequest(new { message = "Invalid city name." });

    var client = _httpClientFactory.CreateClient();
    // countryCode=LK + count=5
    var url = $"https://geocoding-api.open-meteo.com/v1/search?name={Uri.EscapeDataString(city.Trim())}&count=5&language=en&format=json&countryCode=LK";

    try
    {
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Geocoding failed for {City}: {Status}", city, response.StatusCode);
            return StatusCode((int)response.StatusCode, new { message = "Geocoding service unavailable." });
        }

        var json = await response.Content.ReadAsStringAsync();
        return Content(json, "application/json");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Geocoding error for {City}", city);
        return StatusCode(500, new { message = "Geocoding failed." });
    }
}

        // CURRENT / FORECAST WEATHER 
[HttpGet("forecast")]
public async Task<IActionResult> Forecast(
    [FromQuery] double latitude,
    [FromQuery] double longitude,
    [FromQuery] string? start_date = null,
    [FromQuery] string? end_date = null,
    [FromQuery] bool hourly = false)   
{
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
        return BadRequest(new { message = "Invalid coordinates." });

    var client = _httpClientFactory.CreateClient();

    string url;
    if (string.IsNullOrEmpty(start_date))
    {
        // Current weather
        url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}" +
              "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation";
    }
    else if (hourly)
    {
        // Real hourly for a specific date (or range)
        url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}" +
              $"&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code" +
              $"&start_date={start_date}&end_date={end_date ?? start_date}";
    }
    else
    {
        // Daily forecast for a specific date
        url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}" +
              $"&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max" +
              $"&start_date={start_date}&end_date={end_date ?? start_date}";
    }

    try
    {
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { message = "Weather service unavailable." });

        var json = await response.Content.ReadAsStringAsync();
        return Content(json, "application/json");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Forecast error for {Lat},{Lon}", latitude, longitude);
        return StatusCode(500, new { message = "Weather request failed." });
    }
}

        // HISTORICAL WEATHER 
[HttpGet("archive")]
public async Task<IActionResult> Archive(
    [FromQuery] double latitude,
    [FromQuery] double longitude,
    [FromQuery] string start_date,
    [FromQuery] string end_date,
    [FromQuery] bool hourly = false)  
{
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
        return BadRequest(new { message = "Invalid coordinates." });

    var client = _httpClientFactory.CreateClient();
    string url;

    if (hourly)
    {
        url = $"https://archive-api.open-meteo.com/v1/archive?latitude={latitude}&longitude={longitude}" +
              $"&start_date={start_date}&end_date={end_date}" +
              "&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code";
    }
    else
    {
        url = $"https://archive-api.open-meteo.com/v1/archive?latitude={latitude}&longitude={longitude}" +
              $"&start_date={start_date}&end_date={end_date}" +
              "&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max";
    }

    try
    {
        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new { message = "Archive service unavailable." });

        var json = await response.Content.ReadAsStringAsync();
        return Content(json, "application/json");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Archive error for {Lat},{Lon}", latitude, longitude);
        return StatusCode(500, new { message = "Historical weather request failed." });
    }
}

        // SUGGESTIONS 
        [HttpGet("suggestions")]
        public IActionResult GetSuggestion([FromQuery] double temp, [FromQuery] string condition)
        {
            var result = _weatherService.GetSuggestion(temp, condition);

            if (result == null)
            {
                return NotFound(new { message = $"No rules found for {condition} weather at {temp}°C." });
            }

            return Ok(result);
        }
    }
}