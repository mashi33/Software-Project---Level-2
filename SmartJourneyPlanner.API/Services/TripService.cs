using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyBackend.Models;
using MongoDB.Bson; // Required for ObjectId validation

namespace SmartJourneyBackend.Services
{
    public class TripService
    {
        private readonly IMongoCollection<TripItem> _tripCollection;

        public TripService()
        {
            var mongoClient = new MongoClient("mongodb://localhost:27017");
            var mongoDatabase = mongoClient.GetDatabase("SmartJourneyDB");
            _tripCollection = mongoDatabase.GetCollection<TripItem>("Timeline");
        }

        public async Task<List<TripItem>> GetAsync() =>
            await _tripCollection.Find(_ => true).ToListAsync();

        // FIX: Added check to prevent "undefined" or malformed strings from crashing the app
        public async Task<TripItem?> GetAsync(string id)
        {
            if (!ObjectId.TryParse(id, out _)) return null;
            return await _tripCollection.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreateAsync(TripItem newTrip) =>
            await _tripCollection.InsertOneAsync(newTrip);

        // FIX: Ensure ID is valid before attempting replacement
        public async Task UpdateAsync(string id, TripItem updatedTrip)
        {
            if (!ObjectId.TryParse(id, out _)) return;
            await _tripCollection.ReplaceOneAsync(x => x.Id == id, updatedTrip);
        }

        // FIX: Ensure ID is valid before attempting deletion
        public async Task RemoveAsync(string id)
        {
            if (!ObjectId.TryParse(id, out _)) return;
            await _tripCollection.DeleteOneAsync(x => x.Id == id);
        }
    }
}