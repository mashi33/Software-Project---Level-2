using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransportVehiclesController : ControllerBase
    {
        private readonly TransportVehicleService _vehicleService;

        public TransportVehiclesController(TransportVehicleService vehicleService)
        {
            _vehicleService = vehicleService;
        }

        [HttpGet]
        public async Task<List<TransportVehicle>> Get() =>
            await _vehicleService.GetAsync();

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();
            return vehicle;
        }

        [HttpGet("provider/{providerId}")]
        public async Task<List<TransportVehicle>> GetByProvider(string providerId) =>
            await _vehicleService.GetByProviderAsync(providerId);

        [HttpPost]
        public async Task<IActionResult> Post(TransportVehicle newVehicle)
        {
            // Auto-approve for development phase to avoid dependency on Admin component
            newVehicle.Status = "Approved";
            await _vehicleService.CreateAsync(newVehicle);
            return CreatedAtAction(nameof(Get), new { id = newVehicle.Id }, newVehicle);
        }

        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Put(string id, TransportVehicle updatedVehicle)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            updatedVehicle.Id = vehicle.Id;
            await _vehicleService.UpdateAsync(id, updatedVehicle);
            return NoContent();
        }

        [HttpDelete("{id:length(24)}")]
        public async Task<IActionResult> Delete(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            await _vehicleService.RemoveAsync(id);
            return NoContent();
        }

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
    }
}
