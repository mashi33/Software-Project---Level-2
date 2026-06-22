using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AchievementsController : ControllerBase
    {
        private readonly AchievementService _achievementService;

        public AchievementsController(AchievementService achievementService)
        {
            _achievementService = achievementService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAchievements()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Invalid user session." });

            var summary = await _achievementService.EvaluateAndGetAsync(userId);
            return Ok(summary);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Invalid user session." });

            var summary = await _achievementService.GetSummaryAsync(userId);
            return Ok(summary);
        }

        [HttpGet("definitions")]
        [AllowAnonymous]
        public IActionResult GetDefinitions()
        {
            return Ok(AchievementService.AllBadges);
        }

        private string? GetUserId()
        {
            var userId = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId))
                userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return userId;
        }
    }
}
