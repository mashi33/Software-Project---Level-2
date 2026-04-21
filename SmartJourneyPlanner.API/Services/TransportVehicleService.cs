using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Services
{
    public class TransportVehicleService
    {
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public TransportVehicleService(IMongoClient mongoClient, IOptions<DatabaseSettings> databaseSettings)
        {
            var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
            _vehiclesCollection = mongoDatabase.GetCollection<TransportVehicle>(databaseSettings.Value.TransportVehiclesCollectionName);
        }

        public async Task<List<TransportVehicle>> GetAsync() =>
            await _vehiclesCollection.Find(v => v.Status == "Approved").ToListAsync();

        public async Task<List<TransportVehicle>> GetByProviderAsync(string providerId) =>
            await _vehiclesCollection.Find(v => v.ProviderId == providerId).ToListAsync();

        public async Task<TransportVehicle?> GetAsync(string id) =>
            await _vehiclesCollection.Find(v => v.Id == id).FirstOrDefaultAsync();

        public async Task CreateAsync(TransportVehicle newVehicle) =>
            await _vehiclesCollection.InsertOneAsync(newVehicle);

        public async Task UpdateAsync(string id, TransportVehicle updatedVehicle) =>
            await _vehiclesCollection.ReplaceOneAsync(v => v.Id == id, updatedVehicle);

        public async Task RemoveAsync(string id) =>
            await _vehiclesCollection.DeleteOneAsync(v => v.Id == id);

        public async Task DeleteAllAsync() =>
            await _vehiclesCollection.DeleteManyAsync(_ => true);
            
        public async Task InsertManyAsync(List<TransportVehicle> vehicles) =>
            await _vehiclesCollection.InsertManyAsync(vehicles);

        public async Task AddReviewAsync(string id, TransportReview review)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            var update = Builders<TransportVehicle>.Update.Push(v => v.Reviews, review);
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }
    }
}
