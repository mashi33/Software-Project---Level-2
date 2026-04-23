using MongoDB.Driver;
using Microsoft.Extensions.Options;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.API.Services
{
    // This service handles the database logic for the Admin Panel
    public class AdminService
    {
        private readonly IMongoCollection<User> _usersCollection;
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public AdminService(IOptions<MongoDBSettings> settings)
        {
            // Connect to MongoDB using the settings provided
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);

            // Define which collections to use
            _usersCollection = database.GetCollection<User>("Users");
            _vehiclesCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // Gets all vehicles that are marked as 'Pending' in the database
        public async Task<List<TransportVehicle>> GetPendingProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Pending")
                .ToListAsync();
        }

        // Gets all vehicles that have been 'Approved'
        public async Task<List<TransportVehicle>> GetApprovedProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Approved")
                .ToListAsync();
        }

        // Updates the Status of a vehicle (Approve/Reject) by its unique ID
        public async Task UpdateStatusAsync(string id, string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            var update = Builders<TransportVehicle>.Update.Set(v => v.Status, newStatus);
            
            // Apply the update to the database
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }

        // ✅ NEW: Saves vehicle details to the User document
        public async Task UpdateUserVehicleAsync(string id, User updatedUser)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            // Replaces the existing user document with the one containing vehicle info
            await _usersCollection.ReplaceOneAsync(filter, updatedUser);
        }
        // ✅ NEW: Creates a new provider/vehicle document
        public async Task CreateProviderAsync(User newUser)
        {
            await _usersCollection.InsertOneAsync(newUser);
        }
    }
}