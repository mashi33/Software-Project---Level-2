using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class TripService
    {
        private readonly IMongoCollection<TripItem> _tripCollection;

        public TripService(IOptions<MongoDBSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            
            _tripCollection = database.GetCollection<TripItem>("Timeline");
        }

        // Updated this method to sort the timeline correctly
        public async Task<List<TripItem>> GetAsync() =>
            await _tripCollection.Find(_ => true)
                .SortBy(x => x.DayNumber)
                .ThenBy(x => x.OrderIndex)
                .ToListAsync();

        public async Task<TripItem?> GetAsync(string id) =>
            await _tripCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        public async Task CreateAsync(TripItem newTrip) =>
            await _tripCollection.InsertOneAsync(newTrip);

        public async Task UpdateAsync(string id, TripItem updatedTrip) =>
            await _tripCollection.ReplaceOneAsync(x => x.Id == id, updatedTrip);

        public async Task RemoveAsync(string id) =>
            await _tripCollection.DeleteOneAsync(x => x.Id == id);
    }
}