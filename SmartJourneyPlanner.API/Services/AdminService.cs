using MongoDB.Driver;
using Microsoft.Extensions.Options;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class AdminService
    {
        private readonly IMongoCollection<User> _usersCollection;

        public AdminService(IOptions<MongoDBSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _usersCollection = database.GetCollection<User>("Users");
        }

        // For Admin Dashboard: Get Pending
        public async Task<List<User>> GetPendingProvidersAsync()
        {
            return await _usersCollection
                .Find(u => u.UserType == "Provider" && u.Status == "Pending")
                .ToListAsync();
        }

        // For Transport Page: Get Approved
        public async Task<List<User>> GetApprovedProvidersAsync()
        {
            return await _usersCollection
                .Find(u => u.UserType == "Provider" && u.Status == "Approved")
                .ToListAsync();
        }

        // Updates the Status (Approve/Reject)
        public async Task UpdateStatusAsync(string id, string newStatus)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.Status, newStatus);
            await _usersCollection.UpdateOneAsync(filter, update);
        }

        // ✅ NEW: Saves vehicle details to the User document
        public async Task UpdateUserVehicleAsync(string id, User updatedUser)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            // Replaces the existing user document with the one containing vehicle info
            await _usersCollection.ReplaceOneAsync(filter, updatedUser);
        }
    }
}