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
    public async Task<ActionResult<List<TripMemory>>> Get()
    {
        var memories = await _memoryService.GetAsync();
        return Ok(memories);
    }

    // 2. POST: Saves your Frontend form data to MongoDB
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] TripMemory newMemory)
    {
        if (newMemory == null)
        {
            return BadRequest("Memory data is null.");
        }

        // Set the creation time on the server side for accuracy
        newMemory.CreatedAt = DateTime.UtcNow;

        await _memoryService.CreateAsync(newMemory);

        // Return the object so the frontend knows the new MongoDB ID
        return CreatedAtAction(nameof(Get), new { id = newMemory.Id }, newMemory);
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _memoryService.DeleteAsync(id); // Use your MongoDB logic
        if (!result) return NotFound();
        return NoContent();
    }
}