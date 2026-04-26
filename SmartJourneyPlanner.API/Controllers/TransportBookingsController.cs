/**
 * This controller handles everything related to Transport Bookings.
 * It manages the connection between travelers and vehicle owners.
 */

using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;

namespace SmartJourneyPlanner.Controllers
{
    // A small helper object used just for updating the booking status
    public class StatusUpdateDto 
    { 
        public string Status { get; set; } = string.Empty; 
    }

    // This controller defines the API endpoints starting with /api/TransportBookings
    [ApiController]
    [Route("api/[controller]")]
    public class TransportBookingsController : ControllerBase
    {
        private readonly TransportBookingService _bookingService;

        // Constructor injects the service that handles database work
        public TransportBookingsController(TransportBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        /**
         * GET: /api/TransportBookings
         * Returns a list of all transport bookings currently in the database.
         */
        [HttpGet]
        public async Task<List<TransportBooking>> Get() =>
            await _bookingService.GetAsync();

        /**
         * GET: /api/TransportBookings/user/{userId}
         * Returns all trips booked by a specific user (the traveler).
         */
        [HttpGet("user/{userId}")]
        public async Task<List<TransportBooking>> GetByUser(string userId) =>
            await _bookingService.GetByUserAsync(userId);

        /**
         * GET: /api/TransportBookings/provider/{providerId}
         * Returns all booking requests sent to a specific vehicle owner (the provider).
         */
        [HttpGet("provider/{providerId}")]
        public async Task<List<TransportBooking>> GetByProvider(string providerId) =>
            await _bookingService.GetByProviderAsync(providerId);

        /**
         * GET: /api/TransportBookings/{id}
         * Fetches full details for one specific booking using its ID.
         */
        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<TransportBooking>> Get(string id)
        {
            var booking = await _bookingService.GetAsync(id);
            if (booking is null) return NotFound();
            return booking;
        }

        /**
         * POST: /api/TransportBookings
         * Creates a brand new booking record when a user reserves a vehicle.
         */
        [HttpPost]
        public async Task<IActionResult> Post(TransportBooking newBooking)
        {
            // Set the creation timestamp automatically
            newBooking.CreatedAt = DateTime.UtcNow.ToString("o");
            // Save to database
            await _bookingService.CreateAsync(newBooking);
            return CreatedAtAction(nameof(Get), new { id = newBooking.Id }, newBooking);
        }

        /**
         * PATCH: /api/TransportBookings/{id}/status
         * Updates only the status of a booking (e.g. "Pending" -> "Confirmed").
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
         * PATCH: /api/TransportBookings/{id}/rated
         * Marks that a user has finished rating/reviewing this trip.
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
         * PUT: /api/TransportBookings/{id}
         * Updates all the details of an existing booking record.
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
         * DELETE: /api/TransportBookings/{id}
         * Permanently removes a booking record from the system.
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
