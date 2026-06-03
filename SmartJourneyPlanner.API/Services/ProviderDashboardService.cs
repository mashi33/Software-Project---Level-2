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
            var database = mongoClient.GetDatabase("travelPlanner");
            _vehicleCollection = database.GetCollection<TransportVehicle>("Vehicles");
            _bookingCollection = database.GetCollection<TransportBooking>("Bookings");
        }

        public async Task<object> GetDashboardStats()
        {
             // Aggregates lightweight counts to power dashboard KPI cards (not full datasets)
            var totalVehicles = await _vehicleCollection.CountDocumentsAsync(_ => true);
            var totalBookings = await _bookingCollection.CountDocumentsAsync(_ => true);
            return new { totalVehicles, totalBookings };
        }

        public async Task<List<TransportVehicle>> GetAllVehicles() 
        // Full dataset used for fleet management UI rendering
            => await _vehicleCollection.Find(_ => true).ToListAsync();

        public async Task DeleteVehicle(string vehicleId)
        {
            await _vehicleCollection.DeleteOneAsync(vehicle => vehicle.Id == vehicleId);
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