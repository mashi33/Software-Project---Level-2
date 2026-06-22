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

namespace SmartJourneyPlanner.API.Controllers
{
    // keep AllowAnonymous for don't get 401 errors
    // While still testing UI buttons, Turn this off for production
    [AllowAnonymous]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoCollection<User> _userCollection;
        private readonly IMongoCollection<TransportVehicle> _vehicleCollection;
        private readonly IMongoCollection<TripMemory> _memoryCollection;
        private readonly IMongoDatabase _database;
        public AdminController(IMongoClient mongoClient)
        {
            // using direct mongoClient here to save bit of time
            // instead of making a whole new service just for admin tasks
            _database = mongoClient.GetDatabase("SmartJourneyDb");
            _userCollection = _database.GetCollection<User>("Users");
            _vehicleCollection = _database.GetCollection<TransportVehicle>("TransportVehicles");
            _memoryCollection = _database.GetCollection<TripMemory>("TripMemories");
        }

        // NEW DASHBOARD METRICS GATEWAY 
        // Calculates pending counters straight from your vehicle collection

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            // Calculate how many platform log-in accounts exist
            var totalUsers = await _userCollection.CountDocumentsAsync(_ => true);

            // Count vehicles that are waiting under either pending status variation string
            var pendingVehicles = await _vehicleCollection.CountDocumentsAsync(v => 
                v.Status == "Pending" || v.Status == "Pending Approval");

        var budgetsCollection = _database.GetCollection<TripBudget>("Budgets");
        var totalBudgets = await budgetsCollection.CountDocumentsAsync(_ => true);
        var allBudgets = await budgetsCollection.Find(_ => true).ToListAsync();
        var totalExpenditure = allBudgets.Sum(b => b.TotalSpent);

            return Ok(new 
            { 
                pendingProvidersCount = pendingVehicles, 
                platformUsers = totalUsers,
                totalBudgets = totalBudgets,
                totalExpenditure = totalExpenditure
            });
        }

        // DASHBOARD HOME & USERS 
        
        [HttpGet("all-users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userCollection.Find(_ => true).ToListAsync();
            return Ok(users);
        }

[HttpGet("all-vehicles-detailed")]
public async Task<IActionResult> GetAllVehiclesDetailed()
{
    var vehicles = await _vehicleCollection.Find(_ => true).ToListAsync();
    return Ok(vehicles);
}
        [HttpGet("all-memories")]
        public async Task<IActionResult> GetAllMemories()
        {
            // ඔබේ database එකේ memory collection එකේ නම මෙතනට දෙන්න
            var memories = await _memoryCollection.Find(_ => true).ToListAsync();
            return Ok(memories);
        }

        [HttpDelete("delete-memory/{id}")]
public async Task<IActionResult> DeleteMemory(string id)
{
    try 
    {
        // 1. Convert the string ID to a MongoDB ObjectId
        var objectId = new ObjectId(id);

        // 2. Filter using the ObjectId
        var filter = Builders<TripMemory>.Filter.Eq(m => m.Id, id); 

        // Note: If your model uses string Id but maps to BsonType.ObjectId, 
        // the filter above is usually correct. If it still fails, use:
        // var filter = Builders<TripMemory>.Filter.Eq("_id", objectId);

        var result = await _memoryCollection.DeleteOneAsync(filter);
        
        if (result.DeletedCount == 0)
        {
            return NotFound(new { message = "Memory not found in database." });
        }
        
        return Ok(new { message = "Memory permanently removed." });
    }
    catch (Exception ex)
    {
        // This catches cases where the ID format is invalid
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

        [HttpPut("toggle-block/{id}")]
        public async Task<IActionResult> ToggleBlock(string id, [FromBody] BlockRequest request)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, id);
            var update = Builders<User>.Update.Set(u => u.IsBlocked, request.IsBlocked);
            
            await _userCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "Status updated" });
        }

        [HttpDelete("delete-user/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userCollection.DeleteOneAsync(u => u.Id == id);
            return result.DeletedCount == 0 ? NotFound() : Ok(new { message = "User deleted" });
        }

        // AdminController.cs තුළ
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
        var budgets = await _database.GetCollection<TripBudget>("Budgets").Find(_ => true).ToListAsync();
        var tripsCollection = _database.GetCollection<Trip>("Trips");

        var tripDtos = new List<AdminBudgetTripDto>();
        var categoryTotals = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        double totalSpend = 0;
        double totalLimit = 0;
        var overBudgetCount = 0;

        foreach (var budget in budgets)
        {
            var trip = await tripsCollection.Find(t => t.Id == budget.TripId).FirstOrDefaultAsync();

            double budgetLimit = 0;
            if (trip != null && !string.IsNullOrWhiteSpace(trip.BudgetLimit))
            {
                double.TryParse(trip.BudgetLimit, out budgetLimit);
            }

            var spent = budget.TotalSpent;
            totalSpend += spent;
            if (budgetLimit > 0) totalLimit += budgetLimit;
            if (budgetLimit > 0 && spent > budgetLimit) overBudgetCount++;

            foreach (var expense in budget.Expenses ?? new List<Expense>())
            {
                var category = string.IsNullOrWhiteSpace(expense.Category) ? "General" : expense.Category;
                var amount = (double)expense.Amount;
                categoryTotals[category] = categoryTotals.GetValueOrDefault(category) + amount;
            }

            var createdBy = trip?.CreatorEmail ?? trip?.CreatedBy ?? "Unknown";
            var status = budgetLimit <= 0
                ? "No Limit"
                : spent > budgetLimit
                    ? "Over Budget"
                    : spent >= budgetLimit * 0.85
                        ? "Near Limit"
                        : "On Track";

            tripDtos.Add(new AdminBudgetTripDto
            {
                TripName = trip?.TripName ?? "Unknown Trip",
                TripId = budget.TripId,
                CreatedBy = createdBy,
                ExpectedBudget = (decimal)budgetLimit,
                TotalSpent = (decimal)spent,
                RemainingBudget = budgetLimit > 0 ? (decimal)(budgetLimit - spent) : 0,
                UsagePercent = budgetLimit > 0 ? Math.Round(spent / budgetLimit * 100, 1) : 0,
                ExpenseCount = budget.Expenses?.Count ?? 0,
                Status = status,
                Expenses = (budget.Expenses ?? new List<Expense>())
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
                TotalTrackedSpend = (decimal)totalSpend,
                TotalBudgetsTracked = budgets.Count,
                TotalBudgetLimit = (decimal)totalLimit,
                OverBudgetTrips = overBudgetCount,
                AverageSpendPerTrip = budgets.Count > 0 ? (decimal)(totalSpend / budgets.Count) : 0
            },
            Trips = tripDtos.OrderByDescending(t => t.TotalSpent).ToList(),
            CategoryBreakdown = categoryTotals
                .Select(kv => new AdminCategorySpendDto { Category = kv.Key, Amount = (decimal)kv.Value })
                .OrderByDescending(c => c.Amount)
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
        // Uses a dual-filter condition array lookup matching both "Pending" and "Pending Approval"

        [HttpGet("pending-providers")]
        public async Task<IActionResult> GetPendingProviders()
        {
            var pendingFilter = Builders<TransportVehicle>.Filter.Or(
                Builders<TransportVehicle>.Filter.Eq(v => v.Status, "Pending"),
                Builders<TransportVehicle>.Filter.Eq(v => v.Status, "Pending Approval")
            );

            var pending = await _vehicleCollection.Find(pendingFilter).ToListAsync();
            return Ok(pending);
        }

        [HttpGet("provider-detail/{id}")]
        public async Task<IActionResult> GetProviderDetail(string id)
        {
            var vehicle = await _vehicleCollection.Find(v => v.Id == id).FirstOrDefaultAsync();
            return vehicle == null ? NotFound() : Ok(vehicle);
        }

        /**
         * Sets IsVerified to true, but initializes Status as "Unavailable" 
         * so the provider has to tick the checkbox to publish it live
         */
        [HttpPut("update-status/{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string newStatus)
        {
            var filter = Builders<TransportVehicle>.Filter.Eq(v => v.Id, id);

            var isApproved = newStatus.Equals("Approved", StringComparison.OrdinalIgnoreCase);

            var update = Builders<TransportVehicle>.Update
                .Set(v => v.Status, isApproved ? "Unavailable" : newStatus) //  Starts as "Unavailable" when approved
                .Set(v => v.IsVerified, isApproved);
            
            await _vehicleCollection.UpdateOneAsync(filter, update);
            return Ok(new { message = "Status updated" });
        }
    }

    public class BlockRequest 
    { 
        public bool IsBlocked { get; set; } 
    }
}