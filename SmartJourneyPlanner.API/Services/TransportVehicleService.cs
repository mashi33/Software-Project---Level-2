using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.Services
{
    /// <summary>
    /// Service to manage transport vehicles in the database
    /// </summary>
    public class TransportVehicleService
    {
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public TransportVehicleService(IMongoClient mongoClient, IOptions<DatabaseSettings> databaseSettings)
        {
            // Connect to the database and get the vehicles collection
            var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
            _vehiclesCollection = mongoDatabase.GetCollection<TransportVehicle>(databaseSettings.Value.TransportVehiclesCollectionName);
        }

        // Get all vehicles that are either approved or waiting for approval
        public async Task<List<TransportVehicle>> GetAsync() =>
            await _vehiclesCollection.Find(v => v.Status == "Approved" || v.Status == "Pending").ToListAsync();

        // Get vehicles owned by a specific provider
        public async Task<List<TransportVehicle>> GetByProviderAsync(string providerId) =>
            await _vehiclesCollection.Find(v => v.ProviderId == providerId).ToListAsync();

        // Get a single vehicle by its unique ID
        public async Task<TransportVehicle?> GetAsync(string id) =>
            await _vehiclesCollection.Find(v => v.Id == id).FirstOrDefaultAsync();

        // Save a new vehicle to the database
        public async Task CreateAsync(TransportVehicle newVehicle) =>
            await _vehiclesCollection.InsertOneAsync(newVehicle);

        // Update an existing vehicle's information
        public async Task UpdateAsync(string id, TransportVehicle updatedVehicle) =>
            await _vehiclesCollection.ReplaceOneAsync(v => v.Id == id, updatedVehicle);

        // Delete a vehicle from the database
        public async Task RemoveAsync(string id) =>
            await _vehiclesCollection.DeleteOneAsync(v => v.Id == id);

        // Clear all vehicles from the database (use with care)
        public async Task DeleteAllAsync() =>
            await _vehiclesCollection.DeleteManyAsync(_ => true);
            
        // Bulk insert multiple vehicles at once
        public async Task InsertManyAsync(List<TransportVehicle> vehicles) =>
            await _vehiclesCollection.InsertManyAsync(vehicles);

        // Add a customer review to a specific vehicle
        public async Task AddReviewAsync(string id, TransportReview review)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            var update = Builders<TransportVehicle>.Update.Push(v => v.Reviews, review);
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }
    }
}
