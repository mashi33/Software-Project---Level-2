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

        // GEOCODING + LOCATION VALIDATION (Nominatim – Sri Lanka only)
[HttpGet("geocode")]
public async Task<IActionResult> Geocode([FromQuery] string city)
{
    if (string.IsNullOrWhiteSpace(city))
        return BadRequest(new { message = "Location name is required." });

    var trimmed = city.Trim();

    // Basic validation (letters, spaces, hyphen, apostrophe only)
    if (!System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"^[a-zA-Z\s\-'.]+$"))
        return BadRequest(new { message = "Invalid location name." });

    if (trimmed.Length < 2)
        return BadRequest(new { message = "Location name is too short." });

    var client = _httpClientFactory.CreateClient();

    // Nominatim – Sri Lanka only
    var url = "https://nominatim.openstreetmap.org/search" +
              $"?q={Uri.EscapeDataString(trimmed)}" +
              "&countrycodes=lk" +
              "&format=json" +
              "&limit=8" +
              "&addressdetails=1";

    try
    {
        client.DefaultRequestHeaders.UserAgent.ParseAdd("SmartJourneyPlanner/1.0 (weather app)");

        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Geocoding failed for {City}: {Status}", city, response.StatusCode);
            return StatusCode((int)response.StatusCode, new { message = "Geocoding service unavailable." });
        }

        var json = await response.Content.ReadAsStringAsync();

        // Convert Nominatim → Open-Meteo-like shape (frontend compatibility)
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var results = new List<object>();

        foreach (var item in doc.RootElement.EnumerateArray())
        {
            var latStr = item.GetProperty("lat").GetString();
            var lonStr = item.GetProperty("lon").GetString();
            var displayName = item.TryGetProperty("display_name", out var dn) ? dn.GetString() ?? "" : "";
            var name = displayName.Split(',')[0].Trim();
            if (string.IsNullOrEmpty(name)) name = trimmed;

            string admin1 = "";
            if (item.TryGetProperty("address", out var address))
            {
                if (address.TryGetProperty("state", out var state))
                    admin1 = state.GetString() ?? "";
                else if (address.TryGetProperty("province", out var province))
                    admin1 = province.GetString() ?? "";
            }

            results.Add(new
            {
                name,
                latitude = double.Parse(latStr ?? "0", System.Globalization.CultureInfo.InvariantCulture),
                longitude = double.Parse(lonStr ?? "0", System.Globalization.CultureInfo.InvariantCulture),
                country = "Sri Lanka",
                country_code = "LK",
                admin1,
                display_name = displayName
            });
        }

        return Ok(new { results });
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