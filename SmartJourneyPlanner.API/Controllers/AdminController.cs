using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;
using MongoDB.Bson;
using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;

namespace SmartJourneyPlanner.API.Controllers
{
    // keep AllowAnonymous for don't get 401 errors
    [AllowAnonymous]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoCollection<User> _userCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;
        private readonly IMongoCollection<TripMemory> _memoryCollection;
        private readonly IMongoDatabase _database;
        private readonly UserBlockService _userBlockService;
        private readonly NotificationService _notificationService;
        private readonly IHubContext<ChatHub> _hubContext;

        public AdminController(
            IMongoClient mongoClient, 
            UserBlockService userBlockService,
            NotificationService notificationService,
            IHubContext<ChatHub> hubContext)
        {
            _database = mongoClient.GetDatabase("SmartJourneyDb");
            _userCollection = _database.GetCollection<User>("Users");
            _vehicleCollection = _database.GetCollection<TransportVehicle>("TransportVehicles");
            _memoryCollection = _database.GetCollection<TripMemory>("TripMemories");
            _userBlockService = userBlockService;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        private double ParseBudgetLimit(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return 0;

            var numbers = System.Text.RegularExpressions.Regex.Matches(raw, @"\d+")
                .Select(m => double.Parse(m.Value))
                .ToList();

            if (numbers.Count == 0) return 0;
            if (numbers.Count >= 2) return numbers[1];
            return numbers[0];
        }

        // Calculates pending counters straight from vehicle collection
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            // Calculate how many platform log-in accounts exist
            var totalUsers = await _userCollection.CountDocumentsAsync(_ => true);

            // Count vehicles that are waiting under either pending status variation string
            var pendingVehicles = await _vehicleCollection.CountDocumentsAsync(v =>
                v.AdminVerificationStatus == "Pending");

            var tripsCollection = _database.GetCollection<Trip>("Trips");
            var totalTrips = await tripsCollection.CountDocumentsAsync(_ => true);

            var budgets = await _database.GetCollection<TripBudget>("Budgets").Find(_ => true).ToListAsync();
            var budgetByTripId = budgets.ToDictionary(b => b.TripId, b => b);
            var allTrips = await tripsCollection.Find(_ => true).ToListAsync();

            var overBudgetTrips = 0;
            foreach (var trip in allTrips)
            {
                var limit = ParseBudgetLimit(trip.BudgetLimit);
                if (limit <= 0) continue;

                budgetByTripId.TryGetValue(trip.Id ?? string.Empty, out var budget);
                if ((budget?.TotalSpent ?? 0) > limit) overBudgetTrips++;
            }

            return Ok(new
            {
                pendingProvidersCount = pendingVehicles,
                platformUsers = totalUsers,
                totalTrips = totalTrips,
                overBudgetTrips = overBudgetTrips
            });
        }

        [HttpGet("all-users")]
        public async Task<IActionResult> GetAllUsers()
        {
            await _userBlockService.ExpireTemporaryBlocksAsync();
            var users = await _userCollection.Find(_ => true).ToListAsync();
            return Ok(users);
        }

        [HttpGet("all-vehicles-detailed")]
        public async Task<IActionResult> GetAllVehiclesDetailed()
        {
            var vehicles = await _vehicleCollection.Find(_ => true).ToListAsync();
            return Ok(vehicles);
        }

        [HttpGet("all-bookings")]
        public async Task<IActionResult> GetAllBookings()
        {
            var bookings = await _database.GetCollection<TransportBooking>("TransportBookings")
                .Find(_ => true)
                .ToListAsync();
            return Ok(bookings);
        }

        [HttpGet("vehicle-bookings/{vehicleId}")]
        public async Task<IActionResult> GetVehicleBookings(string vehicleId)
        {
            var bookings = await _database.GetCollection<TransportBooking>("TransportBookings")
                .Find(b => b.VehicleId == vehicleId)
                .ToListAsync();
            return Ok(bookings);
        }
        [HttpGet("all-memories")]
        public async Task<IActionResult> GetAllMemories()
        {
            var memories = await _memoryCollection.Find(_ => true).ToListAsync();
            var missingNameUserIds = memories
                .Where(m => string.IsNullOrWhiteSpace(m.FullName) && !string.IsNullOrWhiteSpace(m.UserId))
                .Select(m => m.UserId)
                .Distinct()
                .ToList();

            if (missingNameUserIds.Count > 0)
            {
                var users = await _userCollection
                    .Find(u => missingNameUserIds.Contains(u.Id))
                    .ToListAsync();

                var nameById = users.ToDictionary(u => u.Id!, u => u.FullName);

                foreach (var m in memories)
                {
                    if (string.IsNullOrWhiteSpace(m.FullName) && nameById.TryGetValue(m.UserId, out var name))
                    {
                        m.FullName = name;
                    }
                }
            }

            return Ok(memories);
        }

        [HttpPut("update-memory-status/{id}")]
        public async Task<IActionResult> UpdateMemoryStatus(string id, [FromBody] string newStatus)
        {
            if (string.IsNullOrWhiteSpace(newStatus))
                return BadRequest(new { message = "Status is required." });

            var filter = Builders<TripMemory>.Filter.Eq(m => m.Id, id);
            var update = Builders<TripMemory>.Update.Set(m => m.Status, newStatus);

            var result = await _memoryCollection.UpdateOneAsync(filter, update);
            return result.MatchedCount == 0
                ? NotFound(new { message = "Memory not found." })
                : Ok(new { message = "Status updated" });
        }

        [HttpDelete("delete-memory/{id}")]
        public async Task<IActionResult> DeleteMemory(string id)
        {
            try
            {
                // Convert the string ID to a MongoDB ObjectId
                var objectId = new ObjectId(id);
                // Filter using the ObjectId
                var filter = Builders<TripMemory>.Filter.Eq(m => m.Id, id);
                var result = await _memoryCollection.DeleteOneAsync(filter);

                if (result.DeletedCount == 0)
                {
                    return NotFound(new { message = "Memory not found in database." });
                }

                return Ok(new { message = "Memory permanently removed." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Invalid ID format.", error = ex.Message });
            }
        }

        [HttpPut("promote-user/{id}")]
        public async Task<IActionResult> PromoteUser(string id, [FromBody] string newRole)
        {
            if (string.IsNullOrEmpty(newRole))
                return BadRequest(new { message = "Role is required" });

            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.UserType, newRole);

            var result = await _userCollection.UpdateOneAsync(filter, update);
            return result.MatchedCount == 0 ? NotFound() : Ok(new { message = "Role updated" });
        }

        [HttpPut("block-user/{id}")]
        public async Task<IActionResult> BlockUser(string id, [FromBody] BlockUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.BlockType))
                return BadRequest(new { message = "Block type is required." });

            try
            {
                User? user = request.BlockType.Equals("Permanent", StringComparison.OrdinalIgnoreCase)
                    ? await _userBlockService.BlockUserPermanentAsync(id)
                    : request.BlockType.Equals("Temporary", StringComparison.OrdinalIgnoreCase)
                        ? await _userBlockService.BlockUserTemporaryAsync(id)
                        : null;

                if (user == null) return NotFound(new { message = "User not found." });

                return Ok(new
                {
                    message = request.BlockType.Equals("Permanent", StringComparison.OrdinalIgnoreCase)
                        ? "User permanently blocked."
                        : "User blocked for 2 weeks.",
                    user
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("unblock-user/{id}")]
        public async Task<IActionResult> UnblockUser(string id)
        {
            var user = await _userBlockService.UnblockUserAsync(id);
            return user == null
                ? NotFound(new { message = "User not found." })
                : Ok(new { message = "User unblocked successfully.", user });
        }

        [HttpPut("toggle-block/{id}")]
        public async Task<IActionResult> ToggleBlock(string id, [FromBody] BlockRequest request)
        {
            if (request.IsBlocked)
            {
                return await BlockUser(id, new BlockUserRequest { BlockType = "Permanent" });
            }

            return await UnblockUser(id);
        }

        [HttpDelete("delete-user/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userCollection.DeleteOneAsync(u => u.Id == id);
            return result.DeletedCount == 0 ? NotFound() : Ok(new { message = "User deleted" });
        }

        [HttpGet("all-expenses")]
        public async Task<IActionResult> GetAllExpenses()
        {
            var expenses = await _database.GetCollection<Expense>("Expenses").Find(_ => true).ToListAsync();
            return Ok(expenses);
        }

        [HttpGet("budget-details")]
        public async Task<IActionResult> GetDetailedBudget()
        {
            try
            {
                var tripsCollection = _database.GetCollection<Trip>("Trips");
                var trips = await tripsCollection.Find(_ => true).ToListAsync();
                var budgets = await _database.GetCollection<TripBudget>("Budgets").Find(_ => true).ToListAsync();
                var budgetByTripId = budgets.ToDictionary(b => b.TripId, b => b);

                var tripDtos = new List<AdminBudgetTripDto>();
                var overBudgetCount = 0;
                var onTrackCount = 0;
                var nearLimitCount = 0;

                foreach (var trip in trips)
                {
                    budgetByTripId.TryGetValue(trip.Id ?? string.Empty, out var budget);

                    double budgetLimit = ParseBudgetLimit(trip.BudgetLimit);

                    var spent = budget?.TotalSpent ?? 0;
                    var createdBy = trip.CreatorEmail ?? trip.CreatedBy ?? "Unknown";

                    string status;
                    if (budgetLimit <= 0)
                    {
                        status = "No Limit Set";
                    }
                    else if (spent > budgetLimit)
                    {
                        status = "Over Budget";
                        overBudgetCount++;
                    }
                    else if (spent >= budgetLimit * 0.85)
                    {
                        status = "Near Limit";
                        nearLimitCount++;
                    }
                    else
                    {
                        status = "On Track";
                        onTrackCount++;
                    }

                    tripDtos.Add(new AdminBudgetTripDto
                    {
                        TripName = trip.TripName,
                        TripId = trip.Id ?? string.Empty,
                        CreatedBy = createdBy,
                        DepartFrom = trip.DepartFrom,
                        Destination = trip.Destination,
                        StartDate = trip.StartDate,
                        EndDate = trip.EndDate,
                        BudgetLimit = (decimal)budgetLimit,
                        TotalSpent = (decimal)spent,
                        RemainingBudget = budgetLimit > 0 ? (decimal)(budgetLimit - spent) : 0,
                        UsagePercent = budgetLimit > 0 ? Math.Round(spent / budgetLimit * 100, 1) : 0,
                        ExpenseCount = budget?.Expenses?.Count ?? 0,
                        Status = status,
                        Expenses = (budget?.Expenses ?? new List<Expense>())
                            .Select(e => new AdminExpenseLineDto
                            {
                                Id = e.Id,
                                Description = e.Description,
                                Category = e.Category,
                                Amount = e.Amount,
                                Date = e.Date,
                                AddedBy = e.AddedBy
                            })
                            .OrderByDescending(e => e.Date)
                            .ToList()
                    });
                }

                var overview = new AdminBudgetOverviewDto
                {
                    Summary = new AdminBudgetSummaryDto
                    {
                        TotalTrips = trips.Count,
                        OverBudgetTrips = overBudgetCount,
                        OnTrackTrips = onTrackCount,
                        NearLimitTrips = nearLimitCount
                    },
                    Trips = tripDtos
                        .OrderByDescending(t => t.Status == "Over Budget")
                        .ThenByDescending(t => t.UsagePercent)
                        .ThenBy(t => t.TripName)
                        .ToList()
                };

                return Ok(overview);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        // MANAGE PROVIDERS         
        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            var pendingFilter = Builders<TransportVehicle>.Filter.Eq(v => v.AdminVerificationStatus, "Pending");
            var pending = await _vehicleCollection.Find(pendingFilter).ToListAsync();
            return Ok(pending);
        }

        [HttpGet("provider-detail/{id}")]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
            return vehicle == null ? NotFound() : Ok(vehicle);
        }

        [HttpPut("update-status/{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);
            
            // Fetch the vehicle first so we have access to its details (like ModelName and ProviderId)
            var targetVehicle = await _vehicleCollection.Find(filter).FirstOrDefaultAsync();
            if (targetVehicle == null) return NotFound(new { message = "Vehicle not found." });

            var update = Builders<TransportVehicle>.Update
                .Set(v => v.AdminVerificationStatus, newStatus);

            var updateResult = await _vehicleCollection.UpdateOneAsync(filter, update);

            if (updateResult.MatchedCount == 0)
            {
                return NotFound(new { message = "Vehicle not found." });
            }

            // If the vehicle is rejected, check for active bookings and generate an alert
            if (newStatus.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
            {
                // Find any booking associated with this vehicle ID
                var bookingCollection = _database.GetCollection<TransportBooking>("TransportBookings");
                var bookingFilter = Builders<TransportBooking>.Filter.Eq(b => b.VehicleId, id);
                var activeBooking = await bookingCollection.Find(bookingFilter).FirstOrDefaultAsync();

                if (activeBooking != null && !string.IsNullOrEmpty(activeBooking.UserId))
                {
                    // 1. Get the MongoDB collection for CustomerAlerts
                    var alertCollection = _database.GetCollection<CustomerAlert>("CustomerAlerts");
                    
                    // 2. Instantiate the alert object with the user and vehicle details
                    var customerAlert = new CustomerAlert
                    {
                        UserId = activeBooking.UserId,
                        Title = "Vehicle Service / Booking Notice",
                        Message = "The vehicle you booked has been placed in a service period or restricted by administration. Please try another vehicle.",
                        VehicleInfo = targetVehicle.VehicleClass ?? "Selected Transport",
                        Timestamp = DateTime.UtcNow,
                        Dismissed = false
                    };

                    // 3. Insert the object asynchronously into the database
                    await alertCollection.InsertOneAsync(customerAlert);
                }
            }

            // Generate notification for the Transport Provider!
            try
            {
                var title = newStatus == "Approved"
                    ? $"Your vehicle {targetVehicle.ModelName} listing has been approved by the administrator and is now active!"
                    : $"Your vehicle {targetVehicle.ModelName} listing request was rejected by the administrator. Please update details and re-submit.";

                var icon = newStatus == "Approved" ? "bi-patch-check-fill" : "bi-exclamation-octagon-fill";
                var colorClass = newStatus == "Approved" ? "icon-green" : "icon-red";

                // Note: Time field is intentionally omitted — the frontend calculates relative time from createdAt
                var notification = new Notification
                {
                    UserId = targetVehicle.ProviderId,
                    Icon = icon,
                    IconColorClass = colorClass,
                    Title = title,
                    IsRead = false,
                    LinkText = newStatus == "Approved" ? "Manage Fleet" : "Edit Listing",
                    Route = "/provider-dashboard?panel=fleet"
                };
                
                await _notificationService.CreateNotificationAsync(notification);
                await _hubContext.Clients.Group(notification.UserId).SendAsync("ReceiveNotification", notification);
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"Error creating admin status update notification: {ex.Message}");
            }

            return Ok(new { message = "Status updated" });
        }

        // --- CUSTOMER ALERT ENDPOINTS ---

        [HttpGet("customer-alerts/{userId}")]
        public async Task<IActionResult> GetCustomerAlerts(string userId)
        {
            var alertCollection = _database.GetCollection<CustomerAlert>("CustomerAlerts");
            var filter = Builders<CustomerAlert>.Filter.And(
                Builders<CustomerAlert>.Filter.Eq(a => a.UserId, userId),
                Builders<CustomerAlert>.Filter.Eq(a => a.Dismissed, false)
            );
            var alerts = await alertCollection.Find(filter).ToListAsync();
            return Ok(alerts);
        }

        [HttpPatch("customer-alerts/{alertId}/dismiss")]
        public async Task<IActionResult> DismissCustomerAlert(string alertId)
        {
            var alertCollection = _database.GetCollection<CustomerAlert>("CustomerAlerts");
            var filter = Builders<CustomerAlert>.Filter.Eq(a => a.Id, alertId);
            var update = Builders<CustomerAlert>.Update.Set(a => a.Dismissed, true);

            var result = await alertCollection.UpdateOneAsync(filter, update);
            return result.MatchedCount == 0 ? NotFound() : Ok(new { message = "Alert dismissed" });
        }

    }

    public class CustomerAlert
    {
        [MongoDB.Bson.Serialization.Attributes.BsonId]
        [MongoDB.Bson.Serialization.Attributes.BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)]
        public string? Id { get; set; }

        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string VehicleInfo { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public bool Dismissed { get; set; } = false;
    }

    public class BlockRequest
    {
        public bool IsBlocked { get; set; }
    }

    public class BlockUserRequest
    {
        public string BlockType { get; set; } = string.Empty;
    }
}