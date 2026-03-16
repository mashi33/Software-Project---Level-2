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

        public TimelineController(TimelineService timelineService)
        {
            _timelineService = timelineService;
        }

        [HttpGet]
        public async Task<List<TimelinePlan>> Get()
        {
            Console.WriteLine("[TimelineController] GET all plans requested.");
            return await _timelineService.GetAsync();
        }

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TimelinePlan>> Get(string id)
        {
            Console.WriteLine($"[TimelineController] GET plan {id} requested.");
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound();
            return plan;
        }

        [HttpPost]
        public async Task<IActionResult> Post(TimelinePlan newPlan)
        {
            Console.WriteLine($"[TimelineController] POST new plan: {newPlan.Name}");
            await _timelineService.CreateAsync(newPlan);
            return CreatedAtAction(nameof(Get), new { id = newPlan.Id }, newPlan);
        }

        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Update(string id, TimelinePlan updatedPlan)
        {
            Console.WriteLine($"[TimelineController] PUT update plan: {id}");
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound();
            updatedPlan.Id = plan.Id;
            await _timelineService.UpdateAsync(id, updatedPlan);
            return NoContent();
        }

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