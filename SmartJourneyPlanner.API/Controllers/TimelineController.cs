// This controller defines the API endpoints for the Trip Timeline.
// It allows the frontend to Get, Create, Update, and Delete trip plans.

using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;   
using SmartJourneyPlanner.API.Services; 

namespace SmartJourneyPlanner.API.Controllers
{
    // Controller for managing the user's trip timeline plans
    [ApiController]
    [Route("api/[controller]")]
    public class TimelineController : ControllerBase
    {
        private readonly TimelineService _timelineService;

        // The constructor connects this controller to the TimelineService
        public TimelineController(TimelineService timelineService)
        {
            _timelineService = timelineService;
        }

        // GET: api/Timeline - Get a list of all trip plans saved in the system
        [HttpGet]
        public async Task<List<TimelinePlan>> Get()
        {
            return await _timelineService.GetAsync();
        }

        // GET: api/Timeline/{id} - Get full details for one specific trip plan using its ID
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TimelinePlan>> Get(string id)
        {
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound(); // Send back 404 if the plan doesn't exist
            return plan;
        }

        // POST: api/Timeline - Save a brand new trip plan to the database
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] TimelinePlan newPlan)
        {
            // We use a try-catch block to handle any unexpected errors during saving
            try 
            {
                await _timelineService.CreateAsync(newPlan);
                return CreatedAtAction(nameof(Get), new { id = newPlan.Id }, newPlan);
            }
            catch (Exception ex)
            {
                // If something goes wrong, we log the error for developers to see
                Console.WriteLine($"Error creating plan: {ex.Message}");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/Timeline/{id} - Update the information for an existing trip plan
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TimelinePlan updatedPlan)
        {
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound();
            
            updatedPlan.Id = plan.Id; // Keep the same ID to ensure we update the correct record
            await _timelineService.UpdateAsync(id, updatedPlan);
            return NoContent(); // Success (204 No Content)
        }

        // DELETE: api/Timeline/{id} - Permanently remove a trip plan from the system
        [HttpDelete("{id:length(24)}")]
        public async Task<IActionResult> Delete(string id)
        {
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound();
            
            await _timelineService.RemoveAsync(id);
            return NoContent();
        }
    }
}