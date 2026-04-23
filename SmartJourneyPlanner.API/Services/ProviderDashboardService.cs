using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartJourney.Api.Services
{
    public class ProviderDashboardService
    {
        private readonly IMongoCollection<Vehicle> _vehicleCollection;
        private readonly IMongoCollection<Booking> _bookingCollection;

        public ProviderDashboardService(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("travelPlanner");
            _vehicleCollection = database.GetCollection<Vehicle>("Vehicles");
            _bookingCollection = database.GetCollection<Booking>("Bookings");
        }

        // --- Dashboard Statistics ---
        public async Task<object> GetDashboardStats()
        {
            var totalVehicles = await _vehicleCollection.CountDocumentsAsync(_ => true);
            var totalBookings = await _bookingCollection.CountDocumentsAsync(_ => true);
            return new { totalVehicles, totalBookings };
        }

        // --- Vehicle Operations ---
        public async Task<List<Vehicle>> GetAllVehicles() 
            => await _vehicleCollection.Find(_ => true).ToListAsync();

        public async Task DeleteVehicle(string vehicleId) 
            => await _vehicleCollection.DeleteOneAsync(vehicle => vehicle.Id == vehicleId);

        public async Task UpdateVehicleAvailability(string vehicleId, bool isAvailable)
        {
            var filter = Builders<Vehicle>.Filter.Eq(vehicle => vehicle.Id, vehicleId);
            var update = Builders<Vehicle>.Update.Set(vehicle => vehicle.Available, isAvailable);
            await _vehicleCollection.UpdateOneAsync(filter, update);
        }

        // --- Booking Operations ---
        public async Task<List<Booking>> GetAllBookings() 
            => await _bookingCollection.Find(_ => true).ToListAsync();

        public async Task DeleteBooking(string bookingId) 
            => await _bookingCollection.DeleteOneAsync(booking => booking.Id == bookingId);
    }
}