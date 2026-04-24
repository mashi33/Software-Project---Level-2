using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.API.Services
{
    public class BudgetService
    {
        private readonly IMongoCollection<TripBudget> _budgetCollection;

        public BudgetService(IOptions<MongoDBSettings> mongoDBSettings)
        {
            var mongoClient = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(mongoDBSettings.Value.DatabaseName);
            // Points to your "Budgets" collection in Atlas
            _budgetCollection = mongoDatabase.GetCollection<TripBudget>("Budgets");
        }

        // --- 1. THE CONNECTOR METHOD ---
        // This is what you use to load the Budget page based on the TripId
        public async Task<TripBudget?> GetBudgetByTripIdAsync(string tripId)
        {
            return await _budgetCollection.Find(x => x.TripId == tripId).FirstOrDefaultAsync();
        }

        // --- 2. ADD EXPENSE (Smart Upsert) ---
        public async Task AddExpenseAsync(string tripId, Expense expense)
        {
            var existingTrip = await GetBudgetByTripIdAsync(tripId);

            if (existingTrip == null)
            {
                // Create new budget container if it doesn't exist for this TripId
                var newBudget = new TripBudget
                {
                    TripId = tripId,
                    TotalSpent = (double)expense.Amount,
                    Expenses = new List<Expense> { expense }
                };
                await _budgetCollection.InsertOneAsync(newBudget);
            }
            else
            {
                // Push to existing list and increment total
                var updatePush = Builders<TripBudget>.Update.Push(t => t.Expenses, expense);
                var updateInc = Builders<TripBudget>.Update.Inc(t => t.TotalSpent, (double)expense.Amount);
                var combinedUpdate = Builders<TripBudget>.Update.Combine(updatePush, updateInc);

                await _budgetCollection.UpdateOneAsync(t => t.TripId == tripId, combinedUpdate);
            }
        }

        // --- 3. DELETE EXPENSE ---
        public async Task DeleteExpenseAsync(string tripId, string expenseId)
        {
            var trip = await GetBudgetByTripIdAsync(tripId);

            if (trip == null || trip.Expenses == null) return;

            // Find the item using the ID (much safer than searching by Name)
            var expenseToRemove = trip.Expenses.FirstOrDefault(e => e.Id == expenseId);

            if (expenseToRemove != null)
            {
                trip.Expenses.Remove(expenseToRemove);
                
                // Recalculate Total
                trip.TotalSpent = (double)trip.Expenses.Sum(e => e.Amount);

                await _budgetCollection.ReplaceOneAsync(t => t.TripId == tripId, trip);
            }
        }

        // --- 4. CREATE NEW TRIP CONTAINER ---
        public async Task CreateBudgetAsync(TripBudget newBudget) =>
            await _budgetCollection.InsertOneAsync(newBudget);

        // --- 5. GENERIC UPDATE ---
        public async Task UpdateBudgetAsync(TripBudget updatedBudget)
        {
            await _budgetCollection.ReplaceOneAsync(b => b.TripId == updatedBudget.TripId, updatedBudget);
        }
    }
}