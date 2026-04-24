using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Services
{
    /// <summary>
    /// Service to manage transport bookings in the database
    /// </summary>
    // This service handles all database actions for transport bookings
    public class TransportBookingService
    {
        private readonly IMongoCollection<TransportBooking> _bookingsCollection;

        public TransportBookingService(IMongoClient mongoClient, IOptions<DatabaseSettings> databaseSettings)
        {
            // Connect to MongoDB and find the 'TransportBookings' collection
            var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
            _bookingsCollection = mongoDatabase.GetCollection<TransportBooking>(databaseSettings.Value.TransportBookingsCollectionName);
        }

        // Fetch every single booking from the database
        public async Task<List<TransportBooking>> GetAsync() =>
            await _bookingsCollection.Find(_ => true).ToListAsync();

        // Get all bookings that a specific traveler (user) has made
        public async Task<List<TransportBooking>> GetByUserAsync(string userId) =>
            await _bookingsCollection.Find(b => b.UserId == userId).ToListAsync();

        // Get all bookings that a specific transport provider has received
        public async Task<List<TransportBooking>> GetByProviderAsync(string providerId) =>
            await _bookingsCollection.Find(b => b.ProviderId == providerId).ToListAsync();

        // Find one specific booking using its unique ID
        public async Task<TransportBooking?> GetAsync(string id) =>
            await _bookingsCollection.Find(b => b.Id == id).FirstOrDefaultAsync();

        // Save a new booking request into the database
        public async Task CreateAsync(TransportBooking newBooking) =>
            await _bookingsCollection.InsertOneAsync(newBooking);

        // Update the details of an existing booking (like changing its status)
        public async Task UpdateAsync(string id, TransportBooking updatedBooking) =>
            await _bookingsCollection.ReplaceOneAsync(b => b.Id == id, updatedBooking);

        // Permanently remove a booking record from the database
        public async Task RemoveAsync(string id) =>
            await _bookingsCollection.DeleteOneAsync(b => b.Id == id);
    }
}
