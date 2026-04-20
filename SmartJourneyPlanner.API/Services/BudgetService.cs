using Microsoft.Extensions.Options;               
using MongoDB.Driver;                             
using SmartJourneyPlanner.API.Models;             
using System.Linq;                                
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

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

        // 1. CREATE NEW TRIP CONTAINER
        public async Task CreateBudgetAsync(TripBudget newBudget) =>
            await _budgetCollection.InsertOneAsync(newBudget);

        // 2. GET DATA
        public async Task<TripBudget?> GetBudgetByTripIdAsync(string tripId) =>
            await _budgetCollection.Find(x => x.TripId == tripId).FirstOrDefaultAsync();

        // 3. ADD EXPENSE (Upgraded with Smart-Save / Upsert)
        public async Task AddExpenseAsync(string tripId, Expense expense)
        {
            // First, check if this trip already has a budget in the database
            var existingTrip = await _budgetCollection.Find(t => t.TripId == tripId).FirstOrDefaultAsync();

            if (existingTrip == null)
            {
                // The trip doesn't exist yet! Let's create a brand new budget container for it.
                var newBudget = new TripBudget
                {
                    TripId = tripId,
                    TotalSpent = expense.Amount,
                    Expenses = new List<Expense> { expense }
                };
                await _budgetCollection.InsertOneAsync(newBudget);
            }
            else
            {
                // The trip exists, so just push the new expense into the array and increase the total.
                var updatePush = Builders<TripBudget>.Update.Push(t => t.Expenses, expense);
                var updateInc = Builders<TripBudget>.Update.Inc(t => t.TotalSpent, expense.Amount);
                var combinedUpdate = Builders<TripBudget>.Update.Combine(updatePush, updateInc);

                await _budgetCollection.UpdateOneAsync(
                    t => t.TripId == tripId,
                    combinedUpdate
                );
            }
        }

        // 4. DELETE EXPENSE (Fixed the CS8602 Yellow Warning)
        public async Task DeleteExpenseAsync(string tripId, string expenseName)
        {
            Console.WriteLine($"--- DEBUGGING DELETE ---");
            Console.WriteLine($"1. Looking for Trip ID: {tripId}");

            var trip = await _budgetCollection.Find(t => t.TripId == tripId).FirstOrDefaultAsync();

            if (trip == null)
            {
                Console.WriteLine($"❌ ERROR: Trip ID '{tripId}' NOT FOUND in MongoDB.");
                return;
            }

            Console.WriteLine($"2. Trip Found. It has {trip.Expenses?.Count ?? 0} expenses.");
            Console.WriteLine($"3. Looking for expense named: '{expenseName}'");

            if (trip.Expenses == null)
            {
                Console.WriteLine($"❌ ERROR: The expense list is NULL.");
                return;
            }

            // Fixed CS8602 Warning by adding the '?' (null conditional operators)
            var expenseToRemove = trip.Expenses
                .FirstOrDefault(e => e.Name?.Trim().ToLower() == expenseName?.Trim().ToLower());

            if (expenseToRemove == null)
            {
                Console.WriteLine($"❌ ERROR: Could not find expense '{expenseName}'.");
                Console.WriteLine("   Available items are: " + string.Join(", ", trip.Expenses.Select(e => e.Name)));
                return;
            }

            Console.WriteLine($"✅ FOUND item: {expenseToRemove.Name}. Amount: {expenseToRemove.Amount}");

            trip.Expenses.Remove(expenseToRemove);

            var newTotal = trip.Expenses.Sum(e => e.Amount);
            Console.WriteLine($"4. Old Total: {trip.TotalSpent} -> New Total: {newTotal}");
            trip.TotalSpent = newTotal;

            var result = await _budgetCollection.ReplaceOneAsync(t => t.TripId == tripId, trip);

            if (result.ModifiedCount > 0)
                Console.WriteLine($"✅ SUCCESS: Database updated.");
            else
                Console.WriteLine($"❌ ERROR: Database acknowledged but did not modify document.");
        }

        // 5. GENERIC UPDATE
        public async Task UpdateBudgetAsync(TripBudget updatedBudget)
        {
            await _budgetCollection.ReplaceOneAsync(b => b.TripId == updatedBudget.TripId, updatedBudget);
        }
    }
}