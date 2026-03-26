using Microsoft.AspNetCore.Mvc;
using SmartJourneyBackend.Models;
using SmartJourneyBackend.Services;

namespace SmartJourneyBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripController : ControllerBase
    {
        private readonly TripService _service;
        public TripController(TripService service) => _service = service;

        [HttpGet]
        public async Task<List<TripItem>> Get() => await _service.GetAsync();

        [HttpPost]
        public async Task<IActionResult> Post(TripItem item)
        {
            await _service.CreateAsync(item);
            return Ok(item);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, TripItem updatedItem)
        {
            if (id.Length != 24) return BadRequest("Invalid ID format");

            var existing = await _service.GetAsync(id);
            if (existing == null) return NotFound();

            updatedItem.Id = existing.Id;
            await _service.UpdateAsync(id, updatedItem);
            return NoContent();
        }

        [HttpPut("{id}/complete")]
        public async Task<IActionResult> Toggle(string id)
        {
            var item = await _service.GetAsync(id);
            if (item == null) return NotFound();
            item.IsCompleted = !item.IsCompleted;
            await _service.UpdateAsync(id, item);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            if (id.Length != 24) return BadRequest();
            await _service.RemoveAsync(id);
            return NoContent();
        }
    }
}