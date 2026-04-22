using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Services
{
    public class TransportBookingService
    {
        private readonly IMongoCollection<TransportBooking> _bookingsCollection;

        public TransportBookingService(IMongoClient mongoClient, IOptions<DatabaseSettings> databaseSettings)
        {
            var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
            _bookingsCollection = mongoDatabase.GetCollection<TransportBooking>(databaseSettings.Value.TransportBookingsCollectionName);
        }

        public async Task<List<TransportBooking>> GetAsync() =>
            await _bookingsCollection.Find(_ => true).ToListAsync();

        public async Task<List<TransportBooking>> GetByUserAsync(string userId) =>
            await _bookingsCollection.Find(b => b.UserId == userId).ToListAsync();

        public async Task<List<TransportBooking>> GetByProviderAsync(string providerId) =>
            await _bookingsCollection.Find(b => b.ProviderId == providerId).ToListAsync();

        public async Task<TransportBooking?> GetAsync(string id) =>
            await _bookingsCollection.Find(b => b.Id == id).FirstOrDefaultAsync();

        public async Task CreateAsync(TransportBooking newBooking) =>
            await _bookingsCollection.InsertOneAsync(newBooking);

        public async Task UpdateAsync(string id, TransportBooking updatedBooking) =>
            await _bookingsCollection.ReplaceOneAsync(b => b.Id == id, updatedBooking);

        public async Task RemoveAsync(string id) =>
            await _bookingsCollection.DeleteOneAsync(b => b.Id == id);
    }
}
