using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using System.Net.Http;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.Controllers
#nullable disable
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowAngularApp")]
    public class MapController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public MapController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("get-static-map")]
        public async Task<IActionResult> GetStaticMap([FromBody] MapRequest request)
        {
            // Check if request or path data is missing
            if (request == null || string.IsNullOrEmpty(request.Path))
            {
                return BadRequest(new { message = "Path data was not provided." });
            }

            try
            {
                // 1. Prepare the Google Static Map URL
                string processedPath = request.Path;

                // Build the URL using string interpolation
                string url = $"https://maps.googleapis.com/maps/api/staticmap?" +
                             $"size=600x400" +
                             $"&path=weight:5|color:0x4285F4ff|enc:{processedPath}" +
                             $"&markers={request.Markers}" +
                             $"&key={request.ApiKey}";

                // Check for Google's maximum URL length limit (8192 characters)
                if (url.Length > 8192)
                {
                    // If the URL is too long, the path may not render. 
                    // We avoid manual cropping to prevent corrupting the polyline.
                    return BadRequest(new { message = "The route path is too long for Google Static Maps. Please simplify the route points in frontend." });
                }

                var client = _httpClientFactory.CreateClient();

                // 2. Fetch the map image from Google
                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var imageBytes = await response.Content.ReadAsByteArrayAsync();

                    // 3. Convert image bytes to a Base64 string for easy use in an HTML <img> tag
                    string base64String = Convert.ToBase64String(imageBytes);

                    // 4. Return the Base64 string as a JSON response
                    return Ok(new { image = base64String });
                }

                // If Google API returns an error, capture and return the details
                var errorContent = await response.Content.ReadAsStringAsync();
                return StatusCode((int)response.StatusCode, new { message = "Google API Error", details = errorContent });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal Server Error: {ex.Message}" });
            }
        }
    }

    // Data model for the map request
    public class MapRequest
    {
        public string Path { get; set; }
        public string Markers { get; set; }
        public string ApiKey { get; set; }
    }
}