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
            // If the connection string is changed in appsettings.json, 
            // the service picks it up automatically without touching this code.
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);

            _usersCollection = database.GetCollection<User>("Users");
            _vehiclesCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        public async Task<List<TransportVehicle>> GetApprovedProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.AdminVerificationStatus == "Approved" && v.IsAvailableForBooking == true)
                .ToListAsync();
        }

        public async Task<List<TransportVehicle>> GetPendingProvidersAsync()
        {
            var pendingFilter = Builders<TransportVehicle>.Filter.Eq(v => v.AdminVerificationStatus, "Pending");
            
            return await _vehiclesCollection
                .Find(pendingFilter)
                .ToListAsync();
        }

        /** PROMOTE USER TO ADMIN **/
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

            var update = Builders<TransportVehicle>.Update
                .Set(v => v.AdminVerificationStatus, newStatus);
                
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }

        public async Task<List<TransportVehicle>> GetByProviderIdAsync(string providerId)
        {
            return await _vehiclesCollection
                .Find(v => v.ProviderId == providerId)
                .ToListAsync();
        }
    }
}