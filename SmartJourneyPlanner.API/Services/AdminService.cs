using MongoDB.Driver;
using Microsoft.Extensions.Options;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.Models;

namespace SmartJourneyPlanner.API.Services
{
    // This service handles all the database logic for the Administrator's dashboard
    public class AdminService
    {
        private readonly IMongoCollection<User> _usersCollection;
        private readonly IMongoCollection<TransportVehicle> _vehiclesCollection;

        public AdminService(IOptions<MongoDBSettings> settings)
        {
            // Connect to MongoDB and find the 'Users' and 'TransportVehicles' collections
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);

            _usersCollection = database.GetCollection<User>("Users");
            _vehiclesCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
        }

        // Get a list of all transport providers (vehicles) that are waiting for admin approval
        public async Task<List<TransportVehicle>> GetPendingProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Pending")
                .ToListAsync();
        }

        // Get a list of all transport providers (vehicles) that have already been approved
        public async Task<List<TransportVehicle>> GetApprovedProvidersAsync()
        {
            return await _vehiclesCollection
                .Find(v => v.Status == "Approved")
                .ToListAsync();
        }

        // Change the status of a vehicle (e.g. from 'Pending' to 'Approved' or 'Rejected')
        public async Task UpdateStatusAsync(string id, string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            var update = Builders<TransportVehicle>.Update.Set(v => v.Status, newStatus);
            
            // Apply the status change in the database
            await _vehiclesCollection.UpdateOneAsync(filter, update);
        }

        // Save vehicle-related details back into a specific User document
        public async Task UpdateUserVehicleAsync(string id, User updatedUser)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            // Replace the old user data with the updated information
            await _usersCollection.ReplaceOneAsync(filter, updatedUser);
        }

        // Add a brand new transport provider (User) record to the system
        public async Task CreateProviderAsync(User newUser)
        {
            await _usersCollection.InsertOneAsync(newUser);
        }
    }
}