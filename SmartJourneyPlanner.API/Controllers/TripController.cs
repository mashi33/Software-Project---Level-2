using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;   
using SmartJourneyPlanner.API.Services; 

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripController : ControllerBase
    {
        private readonly TripService _tripService;

        public TripController(TripService tripService)
        {
            _tripService = tripService;
        }

        [HttpGet]
        public async Task<List<TripItem>> Get() =>
            await _tripService.GetAsync();

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TripItem>> Get(string id)
        {
            var trip = await _tripService.GetAsync(id);
            if (trip is null) return NotFound();
            return trip;
        }

        [HttpPost]
        public async Task<IActionResult> Post(TripItem newTrip)
        {
            await _tripService.CreateAsync(newTrip);
            return CreatedAtAction(nameof(Get), new { id = newTrip.Id }, newTrip);
        }

        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Update(string id, TripItem updatedTrip)
        {
            var trip = await _tripService.GetAsync(id);
            if (trip is null) return NotFound();
            updatedTrip.Id = trip.Id;
            await _tripService.UpdateAsync(id, updatedTrip);
            return NoContent();
        }

        [HttpDelete("{id:length(24)}")]
        public async Task<IActionResult> Delete(string id)
        {
            var trip = await _tripService.GetAsync(id);
            if (trip is null) return NotFound();
            await _tripService.RemoveAsync(id);
            return NoContent();
        }
    }
}