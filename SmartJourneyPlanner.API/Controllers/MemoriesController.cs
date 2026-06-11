using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers;

[ApiController]
[Route("api/[controller]")] 
public class MemoriesController : ControllerBase
{
    private readonly MemoryService _memoryService;

    public MemoriesController(MemoryService memoryService)
    {   
        _memoryService = memoryService;
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
        return StatusCode(500, ex.Message);
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
        return StatusCode(500, ex.Message);
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
        return StatusCode(500, ex.Message);
    }
}

// =========================================================================================
// === ADD THIS NEW COUNT ROUTE HERE ===
// =========================================================================================
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
// =========================================================================================
}