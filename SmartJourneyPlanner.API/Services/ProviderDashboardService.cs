using MongoDB.Driver;
using SmartJourneyPlanner.Models; 
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Services
{
    public class ProviderDashboardService
    {
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;
        private readonly IMongoCollection<TransportBooking> _bookingCollection;

        public ProviderDashboardService(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            
            _vehicleCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
            _bookingCollection = database.GetCollection<TransportBooking>("TransportBookings");
        }

        public async Task<object> GetDashboardStats(string providerId)
        {
             // Aggregates lightweight counts to power dashboard KPI cards (not full datasets)
            var totalVehicles = await _vehicleCollection.CountDocumentsAsync(v => v.ProviderId == providerId);
            var totalBookings = await _bookingCollection.CountDocumentsAsync(b => b.ProviderId == providerId);
            return new 
            { totalVehicles, totalBookings };
        }
      public async Task<List<TransportVehicle>> GetAllVehicles(string ownerEmail) 
        {
            var cleanEmail = ownerEmail.Trim();

            // Filter by the logged-in provider's email (case-insensitive)
            var emailFilter = Builders<TransportVehicle>.Filter.Regex(
                v => v.ProviderId, 
                new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(cleanEmail)}$", "i")
            );

            return await _vehicleCollection.Find(emailFilter).ToListAsync();
        }
        public async Task UpdateVehicleAvailability(string vehicleId, string newStatus)
        {
            bool isAvailable = newStatus.Equals("Available", StringComparison.OrdinalIgnoreCase);

            var filter = Builders<TransportVehicle>.Filter.Eq(vehicle => vehicle.Id, vehicleId);

            var update = Builders<TransportVehicle>.Update.Set(vehicle =>vehicle.IsAvailableForBooking, isAvailable);
            await _vehicleCollection.UpdateOneAsync(filter, update);
        }

        public async Task<List<TransportBooking>> GetAllBookings(string providerId) 
         // Returns complete booking dataset for provider dashboard management
            => await _bookingCollection.Find(b => b.ProviderId == providerId).ToListAsync();

        public async Task DeleteBooking(string bookingId)
        {
            await _bookingCollection.DeleteOneAsync(booking => booking.Id == bookingId);
        }

        public async Task<bool> UpdateBookingStatus(string bookingId, string status)
        {
            var filter = Builders<TransportBooking>.Filter.Eq(booking => booking.Id, bookingId);
            var update = Builders<TransportBooking>.Update.Set(booking => booking.Status, status);
            
            var result = await _bookingCollection.UpdateOneAsync(filter, update);
            // Returns success indicator so controller can decide appropriate HTTP response
            return result.ModifiedCount > 0;
        }
    }
}