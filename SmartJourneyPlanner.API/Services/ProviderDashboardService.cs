using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartJourney.Api.Services
{
    public class ProviderDashboardService
    {
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;
        private readonly IMongoCollection<TransportBooking> _bookingCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;
        private readonly IMongoCollection<TransportBooking> _bookingCollection;

        public ProviderDashboardService(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("travelPlanner");
            _vehicleCollection = database.GetCollection<TransportVehicle>("Vehicles");
            _bookingCollection = database.GetCollection<TransportBooking>("Bookings");
            _vehicleCollection = database.GetCollection<TransportVehicle>("Vehicles");
            _bookingCollection = database.GetCollection<TransportBooking>("Bookings");
        }

        // --- Dashboard Statistics ---
        public async Task<object> GetDashboardStats()
        {
            var totalVehicles = await _vehicleCollection.CountDocumentsAsync(_ => true);
            var totalBookings = await _bookingCollection.CountDocumentsAsync(_ => true);
            return new { totalVehicles, totalBookings };
        }

        // --- Vehicle Operations ---
        public async Task<List<TransportVehicle>> GetAllVehicles() 
        public async Task<List<TransportVehicle>> GetAllVehicles() 
            => await _vehicleCollection.Find(_ => true).ToListAsync();

        public async Task DeleteVehicle(string vehicleId) 
            => await _vehicleCollection.DeleteOneAsync(vehicle => vehicle.Id == vehicleId);

        public async Task UpdateVehicleAvailability(string vehicleId, bool isAvailable)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(vehicle => vehicle.Id, vehicleId);
            
            // Mapping boolean to Status string
            string statusValue = isAvailable ? "Available" : "Unavailable";
            
            var update = Builders<TransportVehicle>.Update.Set(vehicle => vehicle.Status, statusValue);
            var filter = Builders<TransportVehicle>.Filter.Eq(vehicle => vehicle.Id, vehicleId);
            
            // Mapping boolean to Status string
            string statusValue = isAvailable ? "Available" : "Unavailable";
            
            var update = Builders<TransportVehicle>.Update.Set(vehicle => vehicle.Status, statusValue);
            await _vehicleCollection.UpdateOneAsync(filter, update);
        }

        // --- Booking Operations ---
        public async Task<List<TransportBooking>> GetAllBookings() 
        public async Task<List<TransportBooking>> GetAllBookings() 
            => await _bookingCollection.Find(_ => true).ToListAsync();

        
        public async Task DeleteBooking(string bookingId) 
            => await _bookingCollection.DeleteOneAsync(booking => booking.Id == bookingId);

        public async Task<bool> UpdateBookingStatus(string bookingId, string status)
        {
            var filter = Builders<TransportBooking>.Filter.Eq(booking => booking.Id, bookingId);
            var update = Builders<TransportBooking>.Update.Set(booking => booking.Status, status);
            
            var result = await _bookingCollection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdateBookingStatus(string bookingId, string status)
        {
            var filter = Builders<TransportBooking>.Filter.Eq(booking => booking.Id, bookingId);
            var update = Builders<TransportBooking>.Update.Set(booking => booking.Status, status);
            
            var result = await _bookingCollection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }
    }
}