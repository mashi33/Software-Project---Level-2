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

    // 1. GET: Fetch all memories for the Gallery and Map
    [HttpGet]
public async Task<ActionResult<List<TripMemory>>> Get([FromQuery] bool? publicOnly = null)
{
    try 
    {
        var memories = await _memoryService.GetAsync();
        
        if (publicOnly == false)
        {
            // If the error happens here, the 'IsPublic' field 
            // might be missing or null in some records.
            memories = memories.Where(m => m.IsPublic == false).ToList();
        }

        return Ok(memories);
    }
    catch (Exception ex)
    {
        // This will print the specific error to your terminal when you refresh!
        Console.WriteLine("CRASH ERROR: " + ex.Message);
        return StatusCode(500, "Error: " + ex.Message);
    }
}

    // 2. POST: Saves your Frontend form data to MongoDB
    // 2. POST: Saves your Frontend form data to MongoDB
[HttpPost]
public async Task<IActionResult> Post([FromBody] TripMemory newMemory)
{
    try 
    {
        // 1. Log the incoming data to see if it even reaches the API
        Console.WriteLine($"Incoming Data: {newMemory.Title}, {newMemory.LocationName}");

        newMemory.CreatedAt = DateTime.UtcNow;

        await _memoryService.CreateAsync(newMemory);

        return Ok(newMemory); 
    }
    catch (Exception ex)
    {
        // 2. THIS IS THE KEY: Return the full exception message to the frontend
        // This will show up in the "Response" tab of your Network tools
        return StatusCode(500, $"SERVER ERROR: {ex.Message} | StackTrace: {ex.StackTrace}");
    }
}

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _memoryService.DeleteAsync(id); // Use your MongoDB logic
        if (!result) return NotFound();
        return NoContent();
    }
}