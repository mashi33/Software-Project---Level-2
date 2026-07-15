using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Services;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Controllers
{
    [ApiController]
    [Route("api/vote-places")]
    public class VotePlacesController : ControllerBase
    {
        private readonly VotePlacesService _votePlacesService;

        public VotePlacesController(VotePlacesService votePlacesService)
        {
            _votePlacesService = votePlacesService;
        }

        // GET api/vote-places/autocomplete?input=Colombo
        [HttpGet("autocomplete")]
        public async Task<IActionResult> Autocomplete(
            [FromQuery] string input,
            [FromQuery] string? sessionToken = null)
        {
            if (string.IsNullOrWhiteSpace(input) || input.Length < 2)
                return BadRequest("Input too short.");

            var result = await _votePlacesService.AutocompleteAsync(input, sessionToken);
            return Content(result, "application/json");
        }

        // GET api/vote-places/validate?placeId=ChIJ...
        [HttpGet("validate")]
        public async Task<IActionResult> Validate(
            [FromQuery] string placeId,
            [FromQuery] string? sessionToken = null)
        {
            if (string.IsNullOrWhiteSpace(placeId))
                return BadRequest("Place ID required.");

            var isValid = await _votePlacesService.ValidatePlaceAsync(placeId, sessionToken);
            return Ok(new { valid = isValid });
        }
    }
}