using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using SmartJourneyPlanner.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;

namespace SmartJourneyPlanner.API.Services
{
    public class BudgetService
    {
        private readonly IMongoCollection<TripBudget> _budgetCollection;
        private readonly IMongoCollection<BsonDocument> _tripsCollection;
        private readonly NotificationService _notificationService;
        private readonly IHubContext<ChatHub> _hubContext;

        public BudgetService(
            IOptions<MongoDBSettings> mongoDBSettings,
            NotificationService notificationService,
            IHubContext<ChatHub> hubContext)
        {
            var mongoClient = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(mongoDBSettings.Value.DatabaseName);
            
            _budgetCollection = mongoDatabase.GetCollection<TripBudget>("Budgets");
            _tripsCollection = mongoDatabase.GetCollection<BsonDocument>("Trips");
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        // GET USER TRIPS FOR DROPDOWN LISTING
        public async Task<List<object>> GetUserTripsFromTripsCollectionAsync(string userEmail)
        {
            var cleanEmail = userEmail.Trim();

            var filter = Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Eq("CreatorEmail", cleanEmail),
                Builders<BsonDocument>.Filter.ElemMatch<BsonDocument>("Members", Builders<BsonDocument>.Filter.Eq("Email", cleanEmail))
            );

            var documents = await _tripsCollection.Find(filter).ToListAsync();
            
            var tripDropdownList = new List<object>();
            foreach (var doc in documents)
            {
                tripDropdownList.Add(new
                {
                    id = doc.Contains("_id") ? doc["_id"].ToString() : "",
                    tripName = doc.Contains("TripName") ? doc["TripName"].ToString() : ""
                });
            }
            return tripDropdownList;
        }
        // CORE BUDGET OPERATIONS
        public async Task<TripBudget> GetBudgetByTripIdAsync(string tripId)
        {
            var budget = await _budgetCollection.Find(x => x.TripId == tripId).FirstOrDefaultAsync();

            if (budget == null)
            {
                budget = new TripBudget 
                { 
                    TripId = tripId, 
                    TotalSpent = 0, 
                    Expenses = new List<Expense>() 
                };
                
                await _budgetCollection.InsertOneAsync(budget);
            }
            
            return budget;
        }

        public async Task AddExpenseAsync(string tripId, Expense expense)
        {
            var budget = await GetBudgetByTripIdAsync(tripId);
            double totalSpentBefore = budget?.TotalSpent ?? 0;
            double totalSpentAfter = totalSpentBefore + (double)expense.Amount;

            var updatePush = Builders<TripBudget>.Update.Push(t => t.Expenses, expense);
            var updateInc = Builders<TripBudget>.Update.Inc(t => t.TotalSpent, (double)expense.Amount);
            var combinedUpdate = Builders<TripBudget>.Update.Combine(updatePush, updateInc);

            await _budgetCollection.UpdateOneAsync(t => t.TripId == tripId, combinedUpdate);

            // Trigger budget alerts check
            await CheckAndTriggerBudgetAlertsAsync(tripId, totalSpentBefore, totalSpentAfter);
        }

        public async Task CheckAndTriggerBudgetAlertsAsync(string tripId, double amountBeforeAdd, double amountAfterAdd)
        {
            try
            {
                var tripFilter = Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(tripId));
                var trip = await _tripsCollection.Find(tripFilter).FirstOrDefaultAsync();
                if (trip == null) return;

                var rawLimit = trip.Contains("BudgetLimit") ? trip["BudgetLimit"].ToString() : "";
                double limit = ParseBudgetLimit(rawLimit);
                if (limit <= 0) return;

                var userId = trip.Contains("CreatedBy") ? trip["CreatedBy"].ToString() : "";
                if (string.IsNullOrEmpty(userId)) return;

                var percentBefore = limit > 0 ? (amountBeforeAdd / limit) : 0;
                var percentAfter = limit > 0 ? (amountAfterAdd / limit) : 0;

                // Threshold 1: 80% (exceeded 80% but was below 80% before)
                if (percentAfter >= 0.8 && percentBefore < 0.8 && percentAfter < 0.95)
                {
                    var notification = new Notification
                    {
                        UserId = userId,
                        Icon = "bi-exclamation-triangle-fill",
                        IconColorClass = "icon-red",
                        Title = "Budget alert: You have reached 80% of your estimated trip budget",
                        Time = "Just now",
                        IsRead = false,
                        LinkText = "View Budget",
                        Route = "/budget"
                    };
                    await _notificationService.CreateNotificationAsync(notification);
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
                }
                // Threshold 2: 95% (exceeded 95% but was below 95% before)
                else if (percentAfter >= 0.95 && percentBefore < 0.95)
                {
                    var notification = new Notification
                    {
                        UserId = userId,
                        Icon = "bi-exclamation-triangle-fill",
                        IconColorClass = "icon-red",
                        Title = "Budget alert: You have reached 95% of your estimated trip budget",
                        Time = "Just now",
                        IsRead = false,
                        LinkText = "Manage Expenses",
                        Route = "/budget"
                    };
                    await _notificationService.CreateNotificationAsync(notification);
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error checking budget alerts: {ex.Message}");
            }
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

        public async Task DeleteExpenseAsync(string tripId, string expenseId)
        {
            var trip = await GetBudgetByTripIdAsync(tripId);
            if (trip == null || trip.Expenses == null) return;

            var expenseToRemove = trip.Expenses.FirstOrDefault(e => e.Id == expenseId);
            if (expenseToRemove != null)
            {
                trip.Expenses.Remove(expenseToRemove);
                trip.TotalSpent = (double)trip.Expenses.Sum(e => e.Amount);
                await _budgetCollection.ReplaceOneAsync(t => t.TripId == tripId, trip);
            }
        }

        public async Task CreateBudgetAsync(TripBudget newBudget) =>
            await _budgetCollection.InsertOneAsync(newBudget);

        public async Task UpdateBudgetAsync(TripBudget updatedBudget)
        {
            await _budgetCollection.ReplaceOneAsync(b => b.TripId == updatedBudget.TripId, updatedBudget);
        }
    }
}