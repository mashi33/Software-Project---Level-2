using MongoDB.Driver;
using Microsoft.Extensions.Options;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.API.Services
{
    public class AdminService
    {
        private readonly IMongoCollection<User> _usersCollection;
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public AdminService(IOptions<MongoDBSettings> settings)
        {
            // if change the connection string in appsettings.json, 
            // the service picks it up automatically without me touching this code.
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);

            _usersCollection = database.GetCollection<User>("Users");
            _vehiclesCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // Even though the dashboard focuses on 'Pending', we need this for the 
        // 'Approved' list view so the Admin can see who is currently active
        public async Task<List<TransportVehicle>> GetApprovedProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Approved")
                .ToListAsync();
        }

        public async Task<List<TransportVehicle>> GetPendingProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Pending")
                .ToListAsync();
        }

        public async Task<bool> PromoteToAdmin(string userId)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, userId);
            var update = Builders<User>.Update.Set(u => u.UserType, "Admin");
            var result = await _usersCollection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task UpdateStatusAsync(string id, string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);

            //a dual-field update here
            var update = Builders<TransportVehicle>.Update
                .Set(v => v.Status, newStatus)
                .Set(v => v.IsVerified, newStatus == "Approved");
            
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }

        public async Task<List<TransportVehicle>> GetByProviderIdAsync(string providerId)
        {
            // Useful for when we want to see all vehicles 
            // owned by a specific person, rather than just filtering by status.
            return await _vehiclesCollection
                .Find(v => v.ProviderId == providerId)
                .ToListAsync();
        }
    }
}