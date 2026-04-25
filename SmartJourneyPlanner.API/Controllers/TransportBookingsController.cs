using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    public class StatusUpdateDto 
    { 
        public string Status { get; set; } = string.Empty; 
    }

    // This controller manages all transport booking requests
    [ApiController]
    [Route("api/[controller]")]
    public class TransportBookingsController : ControllerBase
    {
        private readonly TransportBookingService _bookingService;

        public TransportBookingsController(TransportBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        // GET: api/TransportBookings - Get every booking in the system
        [HttpGet]
        public async Task<List<TransportBooking>> Get() =>
            await _bookingService.GetAsync();

        // GET: api/TransportBookings/user/{userId} - Find bookings made by a specific traveler
        [HttpGet("user/{userId}")]
        public async Task<List<TransportBooking>> GetByUser(string userId) =>
            await _bookingService.GetByUserAsync(userId);

        // GET: api/TransportBookings/provider/{providerId} - Find bookings received by a transport provider
        [HttpGet("provider/{providerId}")]
        public async Task<List<TransportBooking>> GetByProvider(string providerId) =>
            await _bookingService.GetByProviderAsync(providerId);

        // GET: api/TransportBookings/{id} - Get details for a single booking using its ID
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportBooking>> Get(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();
            return booking;
        }

        // POST: api/TransportBookings - Create a new booking request when a user wants a vehicle
        [HttpPost]
        public async Task<IActionResult> Post(TransportBooking newBooking)
        {
            newBooking.CreatedAt = DateTime.UtcNow.ToString("o");
            await _bookingService.CreateAsync(newBooking);
            return CreatedAtAction(nameof(Get), new { id = newBooking.Id }, newBooking);
        }

        // PATCH: api/TransportBookings/{id}/status - Change the status (e.g., from Pending to Confirmed)
        [HttpPatch("{id:length(24)}/status")]
        public async Task<IActionResult> PatchStatus(string id, [FromBody] StatusUpdateDto dto)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            booking.Status = dto.Status;
            await _bookingService.UpdateAsync(id, booking);
            return NoContent();
        }

        // PATCH: api/TransportBookings/{id}/rated - Mark a trip as rated so the user cannot rate it again
        [HttpPatch("{id}/rated")]
        public async Task<IActionResult> PatchRated(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            booking.HasBeenRated = true;
            await _bookingService.UpdateAsync(id, booking);
            return NoContent();
        }

        // PUT: api/TransportBookings/{id} - Update all details for a specific booking
        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Update(string id, TransportBooking updatedBooking)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            updatedBooking.Id = booking.Id;
            await _bookingService.UpdateAsync(id, updatedBooking);
            return NoContent();
        }

        // DELETE: api/TransportBookings/{id} - Permanently delete a booking from history
        [HttpDelete("{id:length(24)}")]
        public async Task<IActionResult> Delete(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            await _bookingService.RemoveAsync(id);
            return NoContent();
        }
    }
}
