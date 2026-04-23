using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Services
{
    /// <summary>
    /// Service to manage transport bookings in the database
    /// </summary>
    public class TransportBookingService
    {
        private readonly IMongoCollection<TransportBooking> _bookingsCollection;

        public TransportBookingService(IMongoClient mongoClient, IOptions<DatabaseSettings> databaseSettings)
        {
            // Connect to the database and get the bookings collection
            var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
            _bookingsCollection = mongoDatabase.GetCollection<TransportBooking>(databaseSettings.Value.TransportBookingsCollectionName);
        }

        // Get all bookings from the database
        public async Task<List<TransportBooking>> GetAsync() =>
            await _bookingsCollection.Find(_ => true).ToListAsync();

        // Get bookings made by a specific user
        public async Task<List<TransportBooking>> GetByUserAsync(string userId) =>
            await _bookingsCollection.Find(b => b.UserId == userId).ToListAsync();

        // Get bookings received by a specific provider
        public async Task<List<TransportBooking>> GetByProviderAsync(string providerId) =>
            await _bookingsCollection.Find(b => b.ProviderId == providerId).ToListAsync();

        // Get a single booking by its unique ID
        public async Task<TransportBooking?> GetAsync(string id) =>
            await _bookingsCollection.Find(b => b.Id == id).FirstOrDefaultAsync();

        // Save a new booking request to the database
        public async Task CreateAsync(TransportBooking newBooking) =>
            await _bookingsCollection.InsertOneAsync(newBooking);

        // Update an existing booking (e.g., change status)
        public async Task UpdateAsync(string id, TransportBooking updatedBooking) =>
            await _bookingsCollection.ReplaceOneAsync(b => b.Id == id, updatedBooking);

        // Delete a booking record
        public async Task RemoveAsync(string id) =>
            await _bookingsCollection.DeleteOneAsync(b => b.Id == id);
    }
}
