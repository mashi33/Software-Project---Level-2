/**
 * This controller defines the API endpoints for the Trip Timeline.
 * It acts as the bridge between the Frontend (Angular) and the Backend (Database).
 * It allows users to:
 * - Load their saved trips (GET)
 * - Save a brand new trip (POST)
 * - Update an existing trip (PUT)
 * - Delete a trip (DELETE)
 */

using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;   
using SmartJourneyPlanner.API.Services; 

namespace SmartJourneyPlanner.API.Controllers
{
    // The [ApiController] attribute tells ASP.NET this is a web API
    // [Route] sets the URL path to start with /api/Timeline
    [ApiController]
    [Route("api/[controller]")]
    public class TimelineController : ControllerBase
    {
        private readonly TimelineService _timelineService;

        // The constructor injects the TimelineService so we can talk to the database
        public TimelineController(TimelineService timelineService)
        {
            _timelineService = timelineService;
        }

        /**
         * GET: /api/Timeline
         * Returns a list of all trip plans saved in the database.
         */
        [HttpGet]
        public async Task<List<TimelinePlan>> Get()
        {
            return await _timelineService.GetAsync();
        }

        /**
         * GET: /api/Timeline/{id}
         * Returns full details for one specific trip (e.g. for sharing or detailed viewing).
         */
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TimelinePlan>> Get(string id)
        {
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound(); // Send back 404 if the plan doesn't exist
            return plan;
        }

        /**
         * POST: /api/Timeline
         * Saves a brand new trip plan to the database.
         * The data is sent from the frontend as a JSON object in the "body" of the request.
         */
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] TimelinePlan newPlan)
        {
            try 
            {
                // Call the service to actually write the data to the database
                await _timelineService.CreateAsync(newPlan);
                // Return a "201 Created" success response
                return CreatedAtAction(nameof(Get), new { id = newPlan.Id }, newPlan);
            }
            catch (Exception ex)
            {
                // If there's a technical error, log it so developers can fix it
                Console.WriteLine($"Error creating plan: {ex.Message}");
                return StatusCode(500, "Internal server error");
            }
        }

        /**
         * PUT: /api/Timeline/{id}
         * Updates an existing trip plan (e.g. when the user adds a new event or changes a date).
         */
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TimelinePlan updatedPlan)
        {
            // First check if the trip even exists
            var plan = await _timelineService.GetAsync(id);
            if (plan is null) return NotFound();
            
            // Ensure the updated plan keeps its original ID
            updatedPlan.Id = plan.Id; 
            
            // Save the updated information
            await _timelineService.UpdateAsync(id, updatedPlan);
            
            // Return "204 No Content" indicating success
            return NoContent(); 
        }

        /**
         * DELETE: /api/Timeline/{id}
         * Permanently removes a trip plan from the database.
         */
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