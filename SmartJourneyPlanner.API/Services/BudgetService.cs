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
            _budgetCollection = mongoDatabase.GetCollection<TripBudget>("Budgets");
        }

        // --- 1. THE CONNECTOR (Updated with Auto-Creation) ---
        public async Task<TripBudget> GetBudgetByTripIdAsync(string tripId)
        {
            // Search for an existing budget for this trip
            var budget = await _budgetCollection.Find(x => x.TripId == tripId).FirstOrDefaultAsync();

            // ✅ Fix: If it's a brand new trip, create the container automatically!
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

        // --- 2. ADD EXPENSE ---
        public async Task AddExpenseAsync(string tripId, Expense expense)
        {
            // Reuse the connector to ensure a budget exists
            var existingTrip = await GetBudgetByTripIdAsync(tripId);

            // Push to existing list and increment total
            var updatePush = Builders<TripBudget>.Update.Push(t => t.Expenses, expense);
            var updateInc = Builders<TripBudget>.Update.Inc(t => t.TotalSpent, (double)expense.Amount);
            var combinedUpdate = Builders<TripBudget>.Update.Combine(updatePush, updateInc);

            await _budgetCollection.UpdateOneAsync(t => t.TripId == tripId, combinedUpdate);
        }

        // --- 3. DELETE EXPENSE ---
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