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
            // 🔑 FIXED: Changed "travelPlanner" to "SmartJourneyDb" to match your Atlas layout!
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            
            _vehicleCollection = database.GetCollection<TransportVehicle>("TransportVehicles");
            _bookingCollection = database.GetCollection<TransportBooking>("Bookings");
        }

        public async Task<object> GetDashboardStats()
        {
             // Aggregates lightweight counts to power dashboard KPI cards (not full datasets)
            var totalVehicles = await _vehicleCollection.CountDocumentsAsync(_ => true);
            var totalBookings = await _bookingCollection.CountDocumentsAsync(_ => true);
            return new { totalVehicles, totalBookings };
        }
      public async Task<List<TransportVehicle>> GetAllVehicles(string ownerEmail) 
        {
            var cleanEmail = ownerEmail.Trim();

            // 1. Filter by the logged-in provider's email (case-insensitive)
            var emailFilter = Builders<TransportVehicle>.Filter.Regex(
                v => v.ProviderId, 
                new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(cleanEmail)}$", "i")
            );

            // 🔑 THE FLEET MANAGER WHIETLIST: Allow BOTH Available and Unavailable states to show on her dashboard!
            // This prevents the vehicle from vanishing from her screen when she unticks the box.
            var statusFilter = Builders<TransportVehicle>.Filter.In(v => v.Status, new[] { "Available", "Unavailable", "Approved" });

            // 2. Combine both conditions together
            var combinedFilter = Builders<TransportVehicle>.Filter.And(emailFilter, statusFilter);

            return await _vehicleCollection.Find(combinedFilter).ToListAsync();
        }
        public async Task UpdateVehicleAvailability(string vehicleId, string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(vehicle => vehicle.Id, vehicleId);
            var update = Builders<TransportVehicle>.Update.Set(vehicle => vehicle.Status, newStatus);
            await _vehicleCollection.UpdateOneAsync(filter, update);
        }

        public async Task<List<TransportBooking>> GetAllBookings() 
         // Returns complete booking dataset for provider dashboard management
            => await _bookingCollection.Find(_ => true).ToListAsync();

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