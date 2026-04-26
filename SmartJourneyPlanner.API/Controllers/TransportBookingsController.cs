using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    /// <summary>
    /// Helper object to receive status updates (like "Confirmed" or "Cancelled").
    /// </summary>
    public class StatusUpdateDto 
    { 
        public string Status { get; set; } = string.Empty; 
    }

    /// <summary>
    /// This controller manages the API for Trip Bookings.
    /// It handles requests from travelers and manages the status of trip reservations.
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

        /**
         * GET: api/TransportBookings
         * Returns a list of every booking record ever made.
         */
        [HttpGet]
        public async Task<List<TransportBooking>> Get() =>
            await _bookingService.GetAsync();

        /**
         * GET: api/TransportBookings/user/{userId}
         * Finds and returns all trips booked by a specific traveler.
         */
        [HttpGet("user/{userId}")]
        public async Task<List<TransportBooking>> GetByUser(string userId) =>
            await _bookingService.GetByUserAsync(userId);

        /**
         * GET: api/TransportBookings/provider/{providerId}
         * Finds and returns all booking requests received by a specific vehicle owner.
         */
        [HttpGet("provider/{providerId}")]
        public async Task<List<TransportBooking>> GetByProvider(string providerId) =>
            await _bookingService.GetByProviderAsync(providerId);

        /**
         * GET: api/TransportBookings/{id}
         * Returns the full details of a single booking using its unique ID.
         */
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportBooking>> Get(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();
            return booking;
        }

        /**
         * POST: api/TransportBookings
         * Receives a new trip request from the frontend and saves it to the database.
         */
        [HttpPost]
        public async Task<IActionResult> Post(TransportBooking newBooking)
        {
            newBooking.CreatedAt = DateTime.UtcNow.ToString("o");
            await _bookingService.CreateAsync(newBooking);
            return CreatedAtAction(nameof(Get), new { id = newBooking.Id }, newBooking);
        }

        /**
         * PATCH: api/TransportBookings/{id}/status
         * Updates the status of a trip (e.g. mark it as "Confirmed" or "Rejected").
         */
        [HttpPatch("{id:length(24)}/status")]
        public async Task<IActionResult> PatchStatus(string id, [FromBody] StatusUpdateDto dto)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            booking.Status = dto.Status;
            await _bookingService.UpdateAsync(id, booking);
            return NoContent();
        }

        /**
         * PATCH: api/TransportBookings/{id}/rated
         * Marks a trip as completed and rated so the user doesn't review it twice.
         */
        [HttpPatch("{id}/rated")]
        public async Task<IActionResult> PatchRated(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            booking.HasBeenRated = true;
            await _bookingService.UpdateAsync(id, booking);
            return NoContent();
        }

        /**
         * PUT: api/TransportBookings/{id}
         * Updates all the fields of a specific booking record.
         */
        [HttpPut("{id:length(24)}")]
        public async Task<IActionResult> Update(string id, TransportBooking updatedBooking)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();

            updatedBooking.Id = booking.Id;
            await _bookingService.UpdateAsync(id, updatedBooking);
            return NoContent();
        }

        /**
         * DELETE: api/TransportBookings/{id}
         * Permanently removes a booking from the database history.
         */
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
