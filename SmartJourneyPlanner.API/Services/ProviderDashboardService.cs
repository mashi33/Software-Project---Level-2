using MongoDB.Driver;
using SmartJourneyPlanner.Models; 
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

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
            System.Console.WriteLine($"=== UpdateBookingStatus ===");
            System.Console.WriteLine($"Booking ID: {bookingId}");
            System.Console.WriteLine($"New Status: {status}");
            
            // Fetch the booking first to get vehicleId and dates
            var booking = await _bookingCollection.Find(b => b.Id == bookingId).FirstOrDefaultAsync();
            
            if (booking == null)
            {
                System.Console.WriteLine("ERROR: Booking not found");
                return false;
            }
            
            System.Console.WriteLine($"Vehicle ID: {booking.VehicleId}");
            System.Console.WriteLine($"Start Date: {booking.StartDate}");
            System.Console.WriteLine($"End Date: {booking.EndDate}");
            System.Console.WriteLine($"Old Status: {booking.Status}");

            // Update the booking status
            var filter = Builders<TransportBooking>.Filter.Eq(b => b.Id, bookingId);
            var update = Builders<TransportBooking>.Update
                .Set(b => b.Status, status)
                .Set(b => b.StatusChangedDate, DateTime.UtcNow.ToString("o"));
            
            var result = await _bookingCollection.UpdateOneAsync(filter, update);
            System.Console.WriteLine($"Booking update result: ModifiedCount = {result.ModifiedCount}");

            // Handle bookedDates based on status change
            if (result.ModifiedCount > 0)
            {
                await UpdateVehicleBookedDates(booking.VehicleId, booking.StartDate, booking.EndDate, status);
            }

            return result.ModifiedCount > 0;
        }

        // Add or remove date range from vehicle's bookedDates
        private async Task UpdateVehicleBookedDates(string vehicleId, string startDate, string endDate, string status)
        {
            System.Console.WriteLine($"=== UpdateVehicleBookedDates ===");
            System.Console.WriteLine($"Vehicle ID: {vehicleId}");
            System.Console.WriteLine($"Status: {status}");
            
            var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
            var vehicle = await _vehicleCollection.Find(vehicleFilter).FirstOrDefaultAsync();
            
            if (vehicle == null)
            {
                System.Console.WriteLine("ERROR: Vehicle not found");
                return;
            }
            
            System.Console.WriteLine($"Vehicle found: {vehicle.ModelName}");

            // Generate all dates in the range
            var dateRange = GenerateDateRange(startDate, endDate);
            System.Console.WriteLine($"Date range count: {dateRange.Count}");
            
            if (status == "Confirmed")
            {
                System.Console.WriteLine("Adding dates to bookedDates");
                var update = Builders<TransportVehicle>.Update.AddToSetEach(v => v.BookedDates, dateRange);
                var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);
                System.Console.WriteLine($"Add dates result: ModifiedCount = {result.ModifiedCount}");
            }
            else if (status == "Completed" || status == "Cancelled" || status == "Rejected")
            {
                System.Console.WriteLine("Removing dates from bookedDates");
                var update = Builders<TransportVehicle>.Update.PullAll(v => v.BookedDates, dateRange);
                var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);
                System.Console.WriteLine($"Remove dates result: ModifiedCount = {result.ModifiedCount}");
            }
            else
            {
                System.Console.WriteLine($"Status '{status}' does not require bookedDates update");
            }
        }

        // Generate all dates between start and end date
        private List<string> GenerateDateRange(string startDateStr, string endDateStr)
        {
            var dates = new List<string>();
            var startDate = DateTime.Parse(startDateStr);
            var endDate = DateTime.Parse(endDateStr);
            
            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                dates.Add(date.ToString("yyyy-MM-dd"));
            }
            
            return dates;
        }

        // Add blocked date range with overlap validation
        public async Task<(bool Success, string Message)> AddBlockedDateRange(string vehicleId, string startDate, string endDate, string reason)
        {
            try
            {
                System.Console.WriteLine($"=== AddBlockedDateRange ===");
                System.Console.WriteLine($"Vehicle ID: {vehicleId}");
                System.Console.WriteLine($"StartDate: {startDate}");
                System.Console.WriteLine($"EndDate: {endDate}");
                System.Console.WriteLine($"Reason: {reason}");

                // Validate dates
                if (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate))
                {
                    return (false, "StartDate and EndDate are required");
                }

                var start = DateTime.Parse(startDate);
                var end = DateTime.Parse(endDate);

                if (start > end)
                {
                    return (false, "StartDate must be less than or equal to EndDate");
                }

                var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
                var vehicle = await _vehicleCollection.Find(vehicleFilter).FirstOrDefaultAsync();

                if (vehicle == null)
                {
                    return (false, "Vehicle not found");
                }

                // Check for overlaps with existing blocked ranges
                if (vehicle.BlockedDateRanges != null && vehicle.BlockedDateRanges.Any())
                {
                    var overlap = vehicle.BlockedDateRanges.FirstOrDefault(r => 
                        CheckDateOverlap(startDate, endDate, r.StartDate, r.EndDate));

                    if (overlap != null)
                    {
                        return (false, $"Date range overlaps with existing blocked range: {overlap.StartDate} to {overlap.EndDate}");
                    }
                }

                // Create new blocked date range
                var newRange = new BlockedDateRange
                {
                    StartDate = startDate,
                    EndDate = endDate,
                    Reason = reason ?? string.Empty,
                    CreatedAt = DateTime.UtcNow
                };

                // Add to vehicle
                var update = Builders<TransportVehicle>.Update.AddToSet(v => v.BlockedDateRanges, newRange);
                var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);

                if (result.ModifiedCount > 0)
                {
                    System.Console.WriteLine("SUCCESS: Blocked date range added");
                    return (true, "Blocked date range added successfully");
                }
                else
                {
                    return (false, "Failed to add blocked date range");
                }
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"ERROR: {ex.Message}");
                return (false, $"Error: {ex.Message}");
            }
        }

        // Edit blocked date range with overlap validation
        public async Task<(bool Success, string Message)> EditBlockedDateRange(string vehicleId, string rangeId, string startDate, string endDate, string reason)
        {
            try
            {
                System.Console.WriteLine($"=== EditBlockedDateRange ===");
                System.Console.WriteLine($"Vehicle ID: {vehicleId}");
                System.Console.WriteLine($"Range ID: {rangeId}");
                System.Console.WriteLine($"StartDate: {startDate}");
                System.Console.WriteLine($"EndDate: {endDate}");
                System.Console.WriteLine($"Reason: {reason}");

                // Validate dates
                if (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate))
                {
                    return (false, "StartDate and EndDate are required");
                }

                var start = DateTime.Parse(startDate);
                var end = DateTime.Parse(endDate);

                if (start > end)
                {
                    return (false, "StartDate must be less than or equal to EndDate");
                }

                var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
                var vehicle = await _vehicleCollection.Find(vehicleFilter).FirstOrDefaultAsync();

                if (vehicle == null)
                {
                    return (false, "Vehicle not found");
                }

                if (vehicle.BlockedDateRanges == null || !vehicle.BlockedDateRanges.Any())
                {
                    return (false, "No blocked date ranges found for this vehicle");
                }

                var existingRange = vehicle.BlockedDateRanges.FirstOrDefault(r => r.Id == rangeId);
                if (existingRange == null)
                {
                    return (false, "Blocked date range not found");
                }

                // Check for overlaps with other existing blocked ranges (excluding the current one)
                var overlap = vehicle.BlockedDateRanges
                    .Where(r => r.Id != rangeId)
                    .FirstOrDefault(r => CheckDateOverlap(startDate, endDate, r.StartDate, r.EndDate));

                if (overlap != null)
                {
                    return (false, $"Date range overlaps with existing blocked range: {overlap.StartDate} to {overlap.EndDate}");
                }

                // Update the range by pulling the old one and adding the updated one
                var pullFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
                var pullUpdate = Builders<TransportVehicle>.Update.PullFilter(
                    v => v.BlockedDateRanges, 
                    r => r.Id == rangeId);
                
                await _vehicleCollection.UpdateOneAsync(pullFilter, pullUpdate);

                // Add the updated range
                var updatedRange = new BlockedDateRange
                {
                    Id = rangeId,
                    StartDate = startDate,
                    EndDate = endDate,
                    Reason = reason ?? string.Empty,
                    CreatedAt = existingRange.CreatedAt
                };

                var pushUpdate = Builders<TransportVehicle>.Update.AddToSet(v => v.BlockedDateRanges, updatedRange);
                var result = await _vehicleCollection.UpdateOneAsync(pullFilter, pushUpdate);

                if (result.ModifiedCount > 0)
                {
                    System.Console.WriteLine("SUCCESS: Blocked date range updated");
                    return (true, "Blocked date range updated successfully");
                }
                else
                {
                    return (false, "Failed to update blocked date range");
                }
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"ERROR: {ex.Message}");
                return (false, $"Error: {ex.Message}");
            }
        }

        // Delete blocked date range
        public async Task<(bool Success, string Message)> DeleteBlockedDateRange(string vehicleId, string rangeId)
        {
            try
            {
                System.Console.WriteLine($"=== DeleteBlockedDateRange ===");
                System.Console.WriteLine($"Vehicle ID: {vehicleId}");
                System.Console.WriteLine($"Range ID: {rangeId}");

                var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
                var vehicle = await _vehicleCollection.Find(vehicleFilter).FirstOrDefaultAsync();

                if (vehicle == null)
                {
                    return (false, "Vehicle not found");
                }

                if (vehicle.BlockedDateRanges == null || !vehicle.BlockedDateRanges.Any())
                {
                    return (false, "No blocked date ranges found for this vehicle");
                }

                var existingRange = vehicle.BlockedDateRanges.FirstOrDefault(r => r.Id == rangeId);
                if (existingRange == null)
                {
                    return (false, "Blocked date range not found");
                }

                // Remove the range
                var update = Builders<TransportVehicle>.Update.PullFilter(
                    v => v.BlockedDateRanges, 
                    r => r.Id == rangeId);

                var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);

                if (result.ModifiedCount > 0)
                {
                    System.Console.WriteLine("SUCCESS: Blocked date range deleted");
                    return (true, "Blocked date range deleted successfully");
                }
                else
                {
                    return (false, "Failed to delete blocked date range");
                }
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"ERROR: {ex.Message}");
                return (false, $"Error: {ex.Message}");
            }
        }

        // Get all blocked date ranges for a vehicle
        public async Task<List<BlockedDateRange>> GetBlockedDateRanges(string vehicleId)
        {
            var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
            var vehicle = await _vehicleCollection.Find(vehicleFilter).FirstOrDefaultAsync();

            if (vehicle == null || vehicle.BlockedDateRanges == null)
            {
                return new List<BlockedDateRange>();
            }

            return vehicle.BlockedDateRanges;
        }

        // Helper method to check if two date ranges overlap
        private bool CheckDateOverlap(string start1, string end1, string start2, string end2)
        {
            var s1 = DateTime.Parse(start1);
            var e1 = DateTime.Parse(end1);
            var s2 = DateTime.Parse(start2);
            var e2 = DateTime.Parse(end2);

            return s1 <= e2 && e1 >= s2;
        }
    }
}