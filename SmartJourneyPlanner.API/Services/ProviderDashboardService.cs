using MongoDB.Driver;
using MongoDB.Bson;
using SmartJourneyPlanner.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
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

            // Create indexes once
            try
            {
                _vehicleCollection.Indexes.CreateOne(
                    new CreateIndexModel<TransportVehicle>(
                        Builders<TransportVehicle>.IndexKeys.Ascending(v => v.ProviderId)
                    )
                );

                _bookingCollection.Indexes.CreateOne(
                    new CreateIndexModel<TransportBooking>(
                        Builders<TransportBooking>.IndexKeys.Ascending(b => b.ProviderId)
                    )
                );

                _bookingCollection.Indexes.CreateOne(
                    new CreateIndexModel<TransportBooking>(
                        Builders<TransportBooking>.IndexKeys.Ascending(b => b.VehicleId)
                    )
                );
            }
            catch
            {
                // Index already exists
            }
        }

        //  Consistent case-insensitive filter
        private FilterDefinition<T> CreateProviderFilter<T>(string providerId)
        {
            var cleanId = (providerId ?? "").Trim();
              return Builders<T>.Filter.Regex(
              "ProviderId",
            new BsonRegularExpression($"^{Regex.Escape(cleanId)}$", "i")
            );
        }

       //  MAIN FAST DASHBOARD METHOD 
        public async Task<object> GetFullDashboard(string providerId)
        {
            var cleanId = (providerId ?? "").Trim();
    
               System.Console.WriteLine($"=== GetFullDashboard called with ProviderId: '{cleanId}' ===");

            if (string.IsNullOrEmpty(cleanId))
            {
            return new
            {
               stats = new { totalVehicles = 0, totalBookings = 0 },
               vehicles = new List<TransportVehicle>(),
               bookings = new List<TransportBooking>()
            };
            }

            var vehicleFilter = CreateProviderFilter<TransportVehicle>(cleanId);
            var bookingFilter = CreateProviderFilter<TransportBooking>(cleanId);

    //  PARALLEL QUERIES 
            var vehicleTask = _vehicleCollection.Find(vehicleFilter).ToListAsync();
            var bookingTask = _bookingCollection.Find(bookingFilter).ToListAsync();

            await Task.WhenAll(vehicleTask, bookingTask);

            var vehicles = await vehicleTask;
            var bookings = await bookingTask;

            System.Console.WriteLine($"Vehicles found with Regex: {vehicles.Count}");
            System.Console.WriteLine($"Bookings found with Regex: {bookings.Count}");

           if (vehicles.Count == 0)
           {
            System.Console.WriteLine("No vehicles with Regex. Trying exact match fallback...");
        
            var exactFilter = Builders<TransportVehicle>.Filter.Eq(v => v.ProviderId, cleanId);
            vehicles = await _vehicleCollection.Find(exactFilter).ToListAsync();
        
            System.Console.WriteLine($"Vehicles found with Exact match: {vehicles.Count}");
           }

    // Fast dictionary for vehicle names
           var vehicleNameMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
           foreach (var v in vehicles)
           {
              if (!string.IsNullOrEmpty(v.Id))
            {
              vehicleNameMap[v.Id] = string.IsNullOrEmpty(v.ModelName)
                ? "Standard Vehicle"
                : v.ModelName;
            }
           }

    // Populate vehicleName
           foreach (var booking in bookings)
           {
              string name = "Unassigned Vehicle";
          if (!string.IsNullOrEmpty(booking.VehicleId) &&
            vehicleNameMap.TryGetValue(booking.VehicleId, out var foundName))
            {
              name = foundName;
            }
              booking.vehicleName = name;
            }

          return new
           {
              stats = new
            {
              totalVehicles = vehicles.Count,
              totalBookings = bookings.Count
            },
              vehicles,
              bookings
           };
        }


        public async Task<object> GetDashboardStats(string providerId)
        {
            var vehicleFilter = CreateProviderFilter<TransportVehicle>(providerId);
            var bookingFilter = CreateProviderFilter<TransportBooking>(providerId);

            var totalVehiclesTask = _vehicleCollection.CountDocumentsAsync(vehicleFilter);
            var totalBookingsTask = _bookingCollection.CountDocumentsAsync(bookingFilter);

            await Task.WhenAll(totalVehiclesTask, totalBookingsTask);

            return new
            {
                totalVehicles = await totalVehiclesTask,
                totalBookings = await totalBookingsTask
            };
        }

        public async Task<List<TransportVehicle>> GetAllVehicles(string ownerEmail)
        {
            var filter = CreateProviderFilter<TransportVehicle>(ownerEmail);
            return await _vehicleCollection.Find(filter).ToListAsync();
        }

        public async Task UpdateVehicleAvailability(string vehicleId, string newStatus)
        {
            bool isAvailable = newStatus.Equals("Available", StringComparison.OrdinalIgnoreCase);

            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
            var update = Builders<TransportVehicle>.Update
                .Set(v => v.IsAvailableForBooking, isAvailable);

            await _vehicleCollection.UpdateOneAsync(filter, update);
        }

        public async Task<List<TransportBooking>> GetAllBookings(string providerId)
        {
            var filter = CreateProviderFilter<TransportBooking>(providerId);
            return await _bookingCollection.Find(filter).ToListAsync();
        }

        public async Task DeleteBooking(string bookingId)
        {
            await _bookingCollection.DeleteOneAsync(b => b.Id == bookingId);
        }

        public async Task<bool> UpdateBookingStatus(string bookingId, string status)
        {
            var booking = await _bookingCollection
                .Find(b => b.Id == bookingId)
                .FirstOrDefaultAsync();

            if (booking == null)
                return false;

            var filter = Builders<TransportBooking>.Filter.Eq(b => b.Id, bookingId);
            var update = Builders<TransportBooking>.Update
                .Set(b => b.Status, status)
                .Set(b => b.StatusChangedDate, DateTime.UtcNow.ToString("o"));

            var result = await _bookingCollection.UpdateOneAsync(filter, update);

            if (result.ModifiedCount > 0)
            {
                await UpdateVehicleBookedDates(
                    booking.VehicleId,
                    booking.StartDate,
                    booking.EndDate,
                    status);
            }

            return result.ModifiedCount > 0;
        }

        private async Task UpdateVehicleBookedDates(
            string vehicleId,
            string startDate,
            string endDate,
            string status)
        {
            if (string.IsNullOrEmpty(vehicleId))
                return;

            var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
            var dateRange = GenerateDateRange(startDate, endDate);

            if (dateRange.Count == 0)
                return;

            if (status.Equals("Confirmed", StringComparison.OrdinalIgnoreCase))
            {
                var update = Builders<TransportVehicle>.Update
                    .AddToSetEach(v => v.BookedDates, dateRange);
                await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);
            }
            else if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase) ||
                     status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) ||
                     status.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
            {
                var update = Builders<TransportVehicle>.Update
                    .PullAll(v => v.BookedDates, dateRange);
                await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);
            }
        }

        private List<string> GenerateDateRange(string startDateStr, string endDateStr)
        {
            var dates = new List<string>();

            if (!DateTime.TryParse(startDateStr, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var start) ||
                !DateTime.TryParse(endDateStr, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var end))
            {
                return dates;
            }

            for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
            {
                dates.Add(date.ToString("yyyy-MM-dd"));
            }

            return dates;
        }

        public async Task<(bool Success, string Message, string? Id)> AddBlockedDateRange(
             string vehicleId, string startDate, string endDate, string reason)
        {
        try
        {
        if (string.IsNullOrWhiteSpace(startDate) || string.IsNullOrWhiteSpace(endDate))
            return (false, "StartDate and EndDate are required", null);

        if (!DateTime.TryParse(startDate, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var start) ||
            !DateTime.TryParse(endDate, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var end))
        {
            return (false, "Invalid date format", null);
        }

        if (start > end)
            return (false, "StartDate must be less than or equal to EndDate", null);

        var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
        var vehicle = await _vehicleCollection
            .Find(vehicleFilter)
            .Project(v => new { v.BlockedDateRanges })
            .FirstOrDefaultAsync();

        if (vehicle == null)
            return (false, "Vehicle not found", null);

        if (vehicle.BlockedDateRanges != null && vehicle.BlockedDateRanges.Any())
        {
            var overlap = vehicle.BlockedDateRanges.FirstOrDefault(r =>
                CheckDateOverlap(startDate, endDate, r.StartDate, r.EndDate));

            if (overlap != null)
                return (false, $"Date range overlaps with existing blocked range: {overlap.StartDate} to {overlap.EndDate}", null);
        }

        // Create new blocked date range
        var newRange = new BlockedDateRange
        {
            Id = ObjectId.GenerateNewId().ToString(),
            StartDate = startDate,
            EndDate = endDate,
            Reason = reason ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        var update = Builders<TransportVehicle>.Update
            .AddToSet(v => v.BlockedDateRanges, newRange);

        var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);

        if (result.ModifiedCount > 0)
            return (true, "Blocked date range added successfully", newRange.Id);

        return (false, "Failed to add blocked date range", null);
    }
    catch (Exception ex)
    {
        return (false, $"Error: {ex.Message}", null);
    }
}

        public async Task<(bool Success, string Message)> EditBlockedDateRange(
            string vehicleId, string rangeId, string startDate, string endDate, string reason)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(startDate) || string.IsNullOrWhiteSpace(endDate))
                    return (false, "StartDate and EndDate are required");

                if (!DateTime.TryParse(startDate, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, out var start) ||
                    !DateTime.TryParse(endDate, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None, out var end))
                {
                    return (false, "Invalid date format");
                }

                if (start > end)
                    return (false, "StartDate must be less than or equal to EndDate");

                var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);
                var vehicle = await _vehicleCollection.Find(vehicleFilter).FirstOrDefaultAsync();

                if (vehicle == null)
                    return (false, "Vehicle not found");

                if (vehicle.BlockedDateRanges == null || !vehicle.BlockedDateRanges.Any())
                    return (false, "No blocked date ranges found for this vehicle");

                var existingRange = vehicle.BlockedDateRanges.FirstOrDefault(r => r.Id == rangeId);
                if (existingRange == null)
                    return (false, "Blocked date range not found");

                var overlap = vehicle.BlockedDateRanges
                    .Where(r => r.Id != rangeId)
                    .FirstOrDefault(r => CheckDateOverlap(startDate, endDate, r.StartDate, r.EndDate));

                if (overlap != null)
                    return (false, $"Date range overlaps with existing blocked range: {overlap.StartDate} to {overlap.EndDate}");

                // Remove old
                var pullUpdate = Builders<TransportVehicle>.Update.PullFilter(
                    v => v.BlockedDateRanges, r => r.Id == rangeId);
                await _vehicleCollection.UpdateOneAsync(vehicleFilter, pullUpdate);

                // Insert updated
                var updatedRange = new BlockedDateRange
                {
                    Id = rangeId,
                    StartDate = startDate,
                    EndDate = endDate,
                    Reason = reason ?? string.Empty,
                    CreatedAt = existingRange.CreatedAt
                };

                var pushUpdate = Builders<TransportVehicle>.Update
                    .AddToSet(v => v.BlockedDateRanges, updatedRange);

                var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, pushUpdate);

                return result.ModifiedCount > 0
                    ? (true, "Blocked date range updated successfully")
                    : (false, "Failed to update blocked date range");
            }
            catch (Exception ex)
            {
                return (false, $"Error: {ex.Message}");
            }
        }

        public async Task<(bool Success, string Message)> DeleteBlockedDateRange(string vehicleId, string rangeId)
        {
            try
            {
                var vehicleFilter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, vehicleId);

                var update = Builders<TransportVehicle>.Update.PullFilter(
                    v => v.BlockedDateRanges, r => r.Id == rangeId);

                var result = await _vehicleCollection.UpdateOneAsync(vehicleFilter, update);

                return result.ModifiedCount > 0
                    ? (true, "Blocked date range deleted successfully")
                    : (false, "Blocked date range not found or already deleted");
            }
            catch (Exception ex)
            {
                return (false, $"Error: {ex.Message}");
            }
        }

        public async Task<List<BlockedDateRange>> GetBlockedDateRanges(string vehicleId)
{
    var vehicle = await _vehicleCollection
        .Find(v => v.Id == vehicleId)
        .Project(v => new { v.BlockedDateRanges })
        .FirstOrDefaultAsync();

    return vehicle?.BlockedDateRanges ?? new List<BlockedDateRange>();
}

        private bool CheckDateOverlap(string start1, string end1, string start2, string end2)
        {
            if (!DateTime.TryParse(start1, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var s1) ||
                !DateTime.TryParse(end1, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var e1) ||
                !DateTime.TryParse(start2, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var s2) ||
                !DateTime.TryParse(end2, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var e2))
            {
                return false;
            }

            return s1.Date <= e2.Date && e1.Date >= s2.Date;
        }
    }
}