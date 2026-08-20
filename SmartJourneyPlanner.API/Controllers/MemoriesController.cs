using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Controllers;

public record LikeRequest(
    [property: JsonPropertyName("userId")] string UserId,
    [property: JsonPropertyName("fullName")] string FullName
);

public record CommentRequest(
    [property: JsonPropertyName("userId")] string UserId,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("text")] string Text
);

[ApiController]
[Route("api/[controller]")]
public class MemoriesController : ControllerBase
{
    private readonly MemoryService _memoryService;
    private readonly ILogger<MemoriesController> _logger;

    public MemoriesController(MemoryService memoryService, ILogger<MemoriesController> logger)
    {
        _memoryService = memoryService ?? throw new ArgumentNullException(nameof(memoryService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

// GET ALL PUBLIC MEMORIES
    [HttpGet]
    public async Task<ActionResult<List<TripMemory>>> GetPublicMemories()
    {
        try
        {
            var memories = await _memoryService.GetPublicMemoriesAsync();
            return Ok(memories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching public memories.");
            return StatusCode(500, "An internal server error occurred.");
        }
    }

// GET USER'S PRIVATE MEMORIES
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<TripMemory>>> GetUserMemories(string userId)
    {
        try
        {
            var memories = await _memoryService.GetByUserIdAsync(userId);
            return Ok(memories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching user memories.");
            return StatusCode(500, "An internal server error occurred.");
        }
    }

// GET MEMORIES FOR A TRIP (public + tripMembers only)
    [HttpGet("trip/{tripId}")]
    public async Task<ActionResult<List<TripMemory>>> GetTripMemories(string tripId, [FromQuery] string? userId = null)
    {
        try
        {
            var memories = await _memoryService.GetTripMemoriesAsync(tripId, userId);
            return Ok(memories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching trip memories.");
            return StatusCode(500, "An internal server error occurred.");
        }
    }

// POST – now accepts FormData + image file → uploads to Cloudinary
    [HttpPost]
    public async Task<IActionResult> Post([FromForm] TripMemory newMemory, IFormFile? image)
    {
        try
        {
            if (image != null && image.Length > 0)
            {
                var cloudinaryService = HttpContext.RequestServices.GetRequiredService<CloudinaryService>();
                newMemory.ImageUrl = await cloudinaryService.UploadImageAsync(image);
            }

            if (string.IsNullOrWhiteSpace(newMemory.ImageUrl))
            {
                return BadRequest("Image is required.");
            }

            Console.WriteLine($"Incoming Data: {newMemory.Title}, {newMemory.LocationName}, Visibility: {newMemory.Visibility}");

            newMemory.CreatedAt = DateTime.UtcNow;

            await _memoryService.CreateAsync(newMemory);

            return Ok(newMemory);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"SERVER ERROR: {ex.Message}");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _memoryService.DeleteAsync(id);

        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/like")]
    public async Task<ActionResult<TripMemory>> ToggleLike([FromRoute] string id, [FromBody] LikeRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("Memory ID is required.");
        }

        if (request == null || string.IsNullOrWhiteSpace(request.UserId))
        {
            return BadRequest("User ID is required within the request body.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("Full Name is required within the request body.");
        }

        try
        {
            _logger.LogInformation("Processing like toggle for Memory: {MemoryId} by User: {UserId} ({FullName})", id, request.UserId, request.FullName);

            var updatedMemory = await _memoryService.ToggleLikeAsync(id, request.UserId, request.FullName);

            if (updatedMemory == null)
            {
                _logger.LogWarning("Memory interaction failed. Memory with ID {MemoryId} not found.", id);
                return NotFound($"Memory with ID {id} does not exist.");
            }

            return Ok(updatedMemory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Critical failure during like toggle for Memory ID: {MemoryId}", id);
            return StatusCode(500, "A database concurrency or server error occurred.");
        }
    }

    [HttpGet("user/{userId}/count")]
    public async Task<IActionResult> GetUserMemoryCount(string userId)
    {
        try
        {
            int count = await _memoryService.GetCountByUserIdAsync(userId);
            return Ok(new { count = count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"SERVER ERROR: {ex.Message}");
        }
    }

    // COMMENTS 

    [HttpGet("{id}/comments")]
    public async Task<ActionResult<List<MemoryComment>>> GetComments(string id)
    {
        try
        {
            var comments = await _memoryService.GetCommentsByMemoryIdAsync(id);
            return Ok(comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching comments for memory {MemoryId}", id);
            return StatusCode(500, "An internal server error occurred.");
        }
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<MemoryComment>> AddComment([FromRoute] string id, [FromBody] CommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest("Memory ID is required.");

        if (request == null || string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest("User ID and Full Name are required.");

        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Comment text is required.");

        try
        {
            var comment = await _memoryService.AddCommentAsync(id, request.UserId, request.FullName, request.Text);

            if (comment == null)
                return NotFound("Memory not found or not public.");

            return Ok(comment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment to memory {MemoryId}", id);
            return StatusCode(500, "An internal server error occurred.");
        }
    }

    [HttpDelete("comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(string commentId, [FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(commentId) || string.IsNullOrWhiteSpace(userId))
            return BadRequest("Comment ID and User ID are required.");

        try
        {
            var success = await _memoryService.DeleteCommentAsync(commentId, userId);
            if (!success) return NotFound("Comment not found or you are not the owner.");
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting comment {CommentId}", commentId);
            return StatusCode(500, "An internal server error occurred.");
        }
    }
}