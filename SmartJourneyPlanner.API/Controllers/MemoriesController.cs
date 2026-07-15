using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.API.Controllers;
public record LikeRequest(
    [property: JsonPropertyName("userId")] string UserId,
    [property: JsonPropertyName("fullName")] string FullName
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

    // use to fetch all memories for the Gallery and Map
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

    //Saves your Frontend form data to MongoDB
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] TripMemory newMemory)
    {
        try 
        {
        //Log the incoming data to see if it even reaches the API
            Console.WriteLine($"Incoming Data: {newMemory.Title}, {newMemory.LocationName}");

        // Server-side timestamp ensures trustable creation time regardless of client input
            newMemory.CreatedAt = DateTime.UtcNow;

            await _memoryService.CreateAsync(newMemory);

            return Ok(newMemory); 
        }
        catch (Exception ex)
        {
        // Return the full exception message to the frontend
            return StatusCode(500, $"SERVER ERROR: {ex.Message} | StackTrace: {ex.StackTrace}");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        // Delegates deletion logic to service layer to keep controller clean
        var result = await _memoryService.DeleteAsync(id); // Use your MongoDB logic
        
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
        // Requests the raw count scalar directly from your underlying service layer
        int count = await _memoryService.GetCountByUserIdAsync(userId);
        return Ok(new { count = count });
    }
    catch (Exception ex)
    {
        return StatusCode(500, $"SERVER ERROR: {ex.Message}");
    }
}
}