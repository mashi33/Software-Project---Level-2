using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using MongoDB.Bson;

namespace SmartJourneyPlanner.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransportVehiclesController : ControllerBase
    {
        private readonly AdminService _adminService;
        private readonly TransportVehicleService _vehicleService;

        public TransportVehiclesController(AdminService adminService, TransportVehicleService vehicleService)
        {
            _adminService = adminService;
            _vehicleService = vehicleService;
        }

        /// <summary>
        /// GET: api/TransportVehicles
        /// Fetches only the providers that have been APPROVED by the Admin.
        /// </summary>
        [HttpGet] 
        public async Task<IActionResult> GetAvailableVehicles()
        {
            // Now fetching from the TransportVehicles collection via AdminService (or directly via vehicleService)
            var approved = await _adminService.GetApprovedProvidersAsync();
            return Ok(approved);
        }

        /// <summary>
        /// POST: api/TransportVehicles
        /// Registers a new vehicle and sets status to Pending.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateVehicle([FromBody] TransportVehicle vehicleInfo)
        {
            try 
            {
                vehicleInfo.Status = "Pending";
                if (string.IsNullOrEmpty(vehicleInfo.Id)) vehicleInfo.Id = null;

                await _vehicleService.CreateAsync(vehicleInfo);
                return Ok(new { message = "Vehicle listing submitted for Admin approval!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to submit vehicle", error = ex.Message });
            }
        }

        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromBody] List<TransportVehicle> vehicles)
        {
            if (vehicles == null || !vehicles.Any()) return BadRequest();
            
            await _vehicleService.DeleteAllAsync();
            
            var vehiclesToInsert = vehicles.Select(v => { 
                v.Id = null; 
                v.Status = "Approved"; // Seeded ones are approved by default
                return v; 
            }).ToList();

            await _vehicleService.InsertManyAsync(vehiclesToInsert);
            return Ok(new { message = "Seeded successfully" });
        }

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportVehicle>> Get(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();
            return vehicle;
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var vehicle = await _vehicleService.GetAsync(id);
            if (vehicle is null) return NotFound();

            await _vehicleService.RemoveAsync(id);
            return NoContent();
        }
    }
}