using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    public class StatusUpdateDto 
    { 
        public string Status { get; set; } = string.Empty; 
    }

    /// <summary>
    /// API Controller for managing transport bookings
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TransportBookingsController : ControllerBase
    {
        private readonly TransportBookingService _bookingService;

        public TransportBookingsController(TransportBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        // GET: api/TransportBookings - Get all bookings
        [HttpGet]
        public async Task<List<TransportBooking>> Get() =>
            await _bookingService.GetAsync();

        // GET: api/TransportBookings/user/{userId} - Get bookings for a specific user
        [HttpGet("user/{userId}")]
        public async Task<List<TransportBooking>> GetByUser(string userId) =>
            await _bookingService.GetByUserAsync(userId);

        // GET: api/TransportBookings/provider/{providerId} - Get bookings for a specific provider
        [HttpGet("provider/{providerId}")]
        public async Task<List<TransportBooking>> GetByProvider(string providerId) =>
            await _bookingService.GetByProviderAsync(providerId);

        // GET: api/TransportBookings/{id} - Get a specific booking by ID
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportBooking>> Get(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();
            return booking;
        }

        // POST: api/TransportBookings - Create a new booking request
        [HttpPost]
        public async Task<IActionResult> Post(TransportBooking newBooking)
        {
            newBooking.CreatedAt = DateTime.UtcNow.ToString("o");
            await _bookingService.CreateAsync(newBooking);
            return CreatedAtAction(nameof(Get), new { id = newBooking.Id }, newBooking);
        }

        // PATCH: api/TransportBookings/{id}/status - Update the status of a booking (Confirm/Reject)
        [HttpPatch("{id:length(24)}/status")]
        public async Task<IActionResult> PatchStatus(string id, [FromBody] StatusUpdateDto dto)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            booking.Status = dto.Status;
            await _bookingService.UpdateAsync(id, booking);
            return NoContent();
        }

        // PATCH: api/TransportBookings/{id}/rated - Mark a booking as rated by the user
        [HttpPatch("{id:length(24)}/rated")]
        public async Task<IActionResult> PatchRated(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            booking.HasBeenRated = true;
            await _bookingService.UpdateAsync(id, booking);
            return NoContent();
        }
    }
}
