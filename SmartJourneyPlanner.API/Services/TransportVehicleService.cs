using MongoDB.Driver;
using Microsoft.Extensions.Options;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.Services
{
    // This service handles the actual database operations for transport vehicles
    public class TransportVehicleService
    {
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public TransportVehicleService(IMongoClient mongoClient, IOptions<DatabaseSettings> databaseSettings)
        {
            // Connect to MongoDB and find the 'TransportVehicles' collection
            var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
            _vehiclesCollection = mongoDatabase.GetCollection<TransportVehicle>(databaseSettings.Value.TransportVehiclesCollectionName);
        }

        // --- ✅ FIX FOR CS1061 ERROR ---
        // This links the controller call to the MongoDB query for provider-specific fleet
        public async Task<List<TransportVehicle>> GetByProviderIdAsync(string providerId)
        {
            return await _vehiclesCollection
                .Find(v => v.ProviderId == providerId)
                .ToListAsync();
        }

        // --- 🚐 CORE OPERATIONS ---

        // Fetch all vehicles that are either ready to be booked (Approved) or waiting for review (Pending)
        public async Task<List<TransportVehicle>> GetAsync() =>
            await _vehiclesCollection.Find(v => v.Status == "Approved" || v.Status == "Pending").ToListAsync();

        // Get a list of all vehicles belonging to a specific transport provider
        public async Task<List<TransportVehicle>> GetByProviderAsync(string providerId) =>
            await _vehiclesCollection.Find(v => v.ProviderId == providerId).ToListAsync();

        // Find one specific vehicle using its unique ID
        public async Task<TransportVehicle?> GetAsync(string id) =>
            await _vehiclesCollection.Find(v => v.Id == id).FirstOrDefaultAsync();

        // Add a new vehicle record to the database
        public async Task CreateAsync(TransportVehicle newVehicle) =>
            await _vehiclesCollection.InsertOneAsync(newVehicle);

        // Update the details of an existing vehicle record
        public async Task UpdateAsync(string id, TransportVehicle updatedVehicle) =>
            await _vehiclesCollection.ReplaceOneAsync(v => v.Id == id, updatedVehicle);

        // Delete a vehicle record from the database
        public async Task RemoveAsync(string id) =>
            await _vehiclesCollection.DeleteOneAsync(v => v.Id == id);

        // Wipe out all vehicle records (used mainly during testing or seeding)
        public async Task DeleteAllAsync() =>
            await _vehiclesCollection.DeleteManyAsync(_ => true);
            
        // Insert many vehicle records at the same time
        public async Task InsertManyAsync(List<TransportVehicle> vehicles) =>
            await _vehiclesCollection.InsertManyAsync(vehicles);

        // --- ⭐ REVIEWS ---

        // Add a customer rating and comment to a vehicle's review history
        public async Task AddReviewAsync(string id, TransportReview review)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            // We use 'Push' to add the new review to the 'Reviews' list in the document
            var update = Builders<TransportVehicle>.Update.Push(v => v.Reviews, review);
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }
    }
}