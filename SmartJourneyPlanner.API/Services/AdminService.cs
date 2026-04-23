using MongoDB.Driver;
using Microsoft.Extensions.Options;
//using smart_journey.backend.Models; // 👈 MATCHES YOUR User.cs NAMESPACE
using SmartJourneyPlanner.API.Models;   // Still needed for MongoDBSettings

namespace SmartJourneyPlanner.API.Services
{
    public class AdminService
    {
        private readonly IMongoCollection<User> _usersCollection;

        public AdminService(IOptions<MongoDBSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            // Ensure the collection name matches your MongoDB (usually "Users")
            _usersCollection = database.GetCollection<User>("Users");
        }

        // Updated to use 'UserType' instead of 'Role' based on your model
        public async Task<List<User>> GetPendingProvidersAsync()
        {
            return await _usersCollection
                .Find(u => u.UserType == "Provider" && u.Status == "Pending")
                .ToListAsync();
        }

        public async Task UpdateStatusAsync(string id, string newStatus)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            // Note: If your User model doesn't have a 'Status' property yet, 
            // you should add 'public string Status { get; set; } = "Pending";' to User.cs
            var update = Builders<User>.Update.Set("Status", newStatus);
            await _usersCollection.UpdateOneAsync(filter, update);
        }
    }
}