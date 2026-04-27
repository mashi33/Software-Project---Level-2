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
    [HttpGet]
    public async Task<ActionResult<List<TripMemory>>> Get([FromQuery] bool? publicOnly = null)
    {
        try 
        {
            var memories = await _memoryService.GetAsync();
        
            if (publicOnly == false)
            {
                memories = memories.Where(memory => memory.IsPublic == false).ToList();
            }

            return Ok(memories);
        }
        catch (Exception ex)
        {
            Console.WriteLine("CRASH ERROR: " + ex.Message);
            return StatusCode(500, "Error: " + ex.Message);
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
}