// This controller defines the API endpoints for the Trip Timeline.
// It allows the frontend to Get, Create, Update, and Delete trip plans.

using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;   
using SmartJourneyPlanner.API.Services; 

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TimelineController : ControllerBase
    {
        private readonly TimelineService _timelineService;

        // Constructor: Injects the TimelineService to handle database work
        public TimelineController(TimelineService timelineService)
        {
            _timelineService = timelineService;
        }

        // GET: api/Timeline
        // Returns a list of all trip plans
        [HttpGet]
        public async Task<List<TimelinePlan>> Get()
        {
            Console.WriteLine("[TimelineController] GET all plans requested.");
            return await _timelineService.GetAsync();
        }

        // GET: api/Timeline/{id}
        // Returns a single trip plan by its ID
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TimelinePlan>> Get(string id)
        {
            Console.WriteLine($"[TimelineController] GET plan {id} requested.");
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound(); // Return 404 if not found
            return plan;
        }

        // POST: api/Timeline
        // Creates a new trip plan
        [HttpPost]
        public async Task<IActionResult> Post(TimelinePlan newPlan)
        {
            Console.WriteLine($"[TimelineController] POST new plan: {newPlan.Name}");
            await _timelineService.CreateAsync(newPlan);
            return CreatedAtAction(nameof(Get), new { id = newPlan.Id }, newPlan);
        }

        // PUT: api/Timeline/{id}
        // Updates an existing trip plan
        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Update(string id, TimelinePlan updatedPlan)
        {
            Console.WriteLine($"[TimelineController] PUT update plan: {id}");
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound();
            
            updatedPlan.Id = plan.Id; // Ensure we keep the same database ID
            await _timelineService.UpdateAsync(id, updatedPlan);
            return NoContent(); // Return 204 Success
        }

        // DELETE: api/Timeline/{id}
        // Deletes a trip plan
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