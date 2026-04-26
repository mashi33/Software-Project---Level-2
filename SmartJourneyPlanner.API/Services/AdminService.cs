using MongoDB.Driver;
using Microsoft.Extensions.Options;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.API.Services
{
    // This service handles all the database logic for the Administrator's dashboard
    public class AdminService
    {
        private readonly IMongoCollection<User> _usersCollection;
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public AdminService(IOptions<MongoDBSettings> settings)
        {
            // Connect to MongoDB using the configured settings
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);

            _usersCollection = database.GetCollection<User>("Users");
            _vehiclesCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // --- ✅ FIX FOR CS1061 ERROR ---
        // Finds all vehicles belonging to a specific provider ID
        public async Task<List<TransportVehicle>> GetByProviderIdAsync(string providerId)
        {
            return await _vehiclesCollection
                .Find(v => v.ProviderId == providerId)
                .ToListAsync();
        }

        // --- 🚐 TRANSPORT PROVIDER LOGIC ---

        // Get a list of all transport providers waiting for admin approval
        public async Task<List<TransportVehicle>> GetPendingProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Pending")
                .ToListAsync();
        }

        // Get a list of all transport providers that have already been approved
        public async Task<List<TransportVehicle>> GetApprovedProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Approved")
                .ToListAsync();
        }

        // Change the status of a vehicle and sync the 'IsVerified' flag
        public async Task UpdateStatusAsync(string id, string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            
            // If approved, set IsVerified to true; otherwise, keep it false
            var update = Builders<TransportVehicle>.Update
                .Set(v => v.Status, newStatus)
                .Set(v => v.IsVerified, newStatus == "Approved");
            
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }

        // --- 👥 USER MANAGEMENT LOGIC ---

        // Update a specific User document (used for role promotions or profile changes)
        public async Task UpdateUserVehicleAsync(string id, User updatedUser)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            await _usersCollection.ReplaceOneAsync(filter, updatedUser);
        }

        // Add a brand new user record to the system
        public async Task CreateProviderAsync(User newUser)
        {
            await _usersCollection.InsertOneAsync(newUser);
        }
    }
}