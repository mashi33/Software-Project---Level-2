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

    [EnableCors("AllowAngular")]
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
            if (request == null || string.IsNullOrEmpty(request.Path))
            {
                return BadRequest(new { message = "පථ දත්ත (Path data) ලබා දී නොමැත." });
            }

            try
            {
                // 1. Google Static Map URL එක සාදා ගැනීම
                // Polyline එකේ string එක මෙහිදී සෘජුවම ලබා ගනී.
                string processedPath = request.Path;

                // URL එක සාදා ගැනීමේදී string interpolation භාවිතා කරයි.
                // වැදගත්: enc:{path} කොටස පථය ඇඳීමට අත්‍යවශ්‍ය වේ.
                string url = $"https://maps.googleapis.com/maps/api/staticmap?" +
                             $"size=600x400" +
                             $"&path=weight:5|color:0x4285F4ff|enc:{processedPath}" +
                             $"&markers={request.Markers}" +
                             $"&key={request.ApiKey}";

                // Google Static Maps API හි උපරිම URL දිග අකුරු 8192 කි.
                if (url.Length > 8192)
                {
                    // URL එක දිගු වැඩි නම් පථය (Polyline) නොපෙනී යාමට ඉඩ ඇත.
                    // මීට පෙර තිබූ Substring කොටස ඉවත් කර ඇත්තේ එයින් පථය Corrupt වන බැවිනි.
                    return BadRequest(new { message = "The route path is too long for Google Static Maps. Please simplify the route points in frontend." });
                }

                var client = _httpClientFactory.CreateClient();

                // 2.  Recieve the image from Google
                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var imageBytes = await response.Content.ReadAsByteArrayAsync();

                    // 3. Bytes ටික Base64 string එකක් බවට හැරවීම (Frontend එකේ <img> tag එකට පහසු වීමට)
                    string base64String = Convert.ToBase64String(imageBytes);

                    // 4. JSON එකක් ලෙස Frontend එකට යැවීම
                    return Ok(new { image = base64String });
                }

                // Google API එකෙන් වැරදි ප්‍රතිචාරයක් ලැබුණහොත් එහි විස්තර ලබා ගැනීම
                var errorContent = await response.Content.ReadAsStringAsync();
                return StatusCode((int)response.StatusCode, new { message = "Google API Error", details = errorContent });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal Server Error: {ex.Message}" });
            }
        }
    }

    public class MapRequest
    {
        public string Path { get; set; }
        public string Markers { get; set; }
        public string ApiKey { get; set; }
    }
}