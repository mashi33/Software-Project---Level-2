using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    /// <summary>
    /// API Controller for managing transport vehicles
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TransportVehiclesController : ControllerBase
    {
        private readonly TransportVehicleService _vehicleService;

        public TransportVehiclesController(TransportVehicleService vehicleService)
        {
            _vehicleService = vehicleService;
        }

        // GET: api/TransportVehicles - Get all vehicles
        [HttpGet]
        public async Task<List<TransportVehicle>> Get() =>
            await _vehicleService.GetAsync();

        // GET: api/TransportVehicles/{id} - Get a specific vehicle by ID
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();
            return vehicle;
        }

        // GET: api/TransportVehicles/provider/{providerId} - Get all vehicles of a provider
        [HttpGet("provider/{providerId}")]
        public async Task<List<TransportVehicle>> GetByProvider(string providerId) =>
            await _vehicleService.GetByProviderAsync(providerId);

        // POST: api/TransportVehicles - Register a new vehicle
        [HttpPost]
        public async Task<IActionResult> Post(TransportVehicle newVehicle)
        {
            // Auto-approve for development phase to avoid dependency on Admin component
            newVehicle.Status = "Approved";
            await _vehicleService.CreateAsync(newVehicle);
            return CreatedAtAction(nameof(Get), new { id = newVehicle.Id }, newVehicle);
        }

        // PUT: api/TransportVehicles/{id} - Update vehicle details
        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Put(string id, TransportVehicle updatedVehicle)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            updatedVehicle.Id = vehicle.Id;
            await _vehicleService.UpdateAsync(id, updatedVehicle);
            return NoContent();
        }

        // DELETE: api/TransportVehicles/{id} - Remove a vehicle
        [HttpDelete("{id:length(24)}")]
        public async Task<IActionResult> Delete(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            await _vehicleService.RemoveAsync(id);
            return NoContent();
        }

        // POST: api/TransportVehicles/seed - Populate initial data
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromBody] List<TransportVehicle> vehicles)
        {
            if (vehicles == null || !vehicles.Any()) return BadRequest();
            
            // clear existing data before seeding to avoid duplicates
            await _vehicleService.DeleteAllAsync();
            
            // remove id to let mongo auto generate ObjectId
            var vehiclesToInsert = vehicles.Select(v => { v.Id = null; return v; }).ToList();
            await _vehicleService.InsertManyAsync(vehiclesToInsert);
            return Ok(new { message = "Seeded successfully" });
        }

        // POST: api/TransportVehicles/{id}/reviews - Add a review to a vehicle
        [HttpPost("{id:length(24)}/reviews")]
        public async Task<IActionResult> AddReview(string id, [FromBody] TransportReview review)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            if (string.IsNullOrEmpty(review.Date))
            {
                review.Date = DateTime.UtcNow.ToString("yyyy-MM-dd");
            }

            await _vehicleService.AddReviewAsync(id, review);
            return Ok(new { message = "Review added successfully" });
        }
    }
}
