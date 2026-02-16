using Microsoft.Extensions.Options;               // 1. Required for MongoDBSettings
using MongoDB.Driver;                             // 2. Required for database connection
using SmartJourneyPlanner.API.Models;             // 3. Required for TripBudget
using System.Linq;                                // 4. ✅ REQUIRED for .Sum()

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

        // 3. ADD EXPENSE (With Auto-Calculation)
        public async Task AddExpenseAsync(string tripId, Expense expense)
        {
            var updatePush = Builders<TripBudget>.Update.Push(t => t.Expenses, expense);
            var updateInc = Builders<TripBudget>.Update.Inc(t => t.TotalSpent, expense.Amount);
            var combinedUpdate = Builders<TripBudget>.Update.Combine(updatePush, updateInc);

            await _budgetCollection.UpdateOneAsync(
                t => t.TripId == tripId,
                combinedUpdate
            );
        }

        // 4. DELETE EXPENSE (Fixed: Re-Calculates Total from Scratch)
        // 4. DELETE EXPENSE (DEBUG VERSION)
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

            // Check if Expenses list exists
            if (trip.Expenses == null)
            {
                Console.WriteLine($"❌ ERROR: The expense list is NULL.");
                return;
            }

            // Find the item (Case Insensitive)
            var expenseToRemove = trip.Expenses
                .FirstOrDefault(e => e.Name.Trim().ToLower() == expenseName.Trim().ToLower());

            if (expenseToRemove == null)
            {
                Console.WriteLine($"❌ ERROR: Could not find expense '{expenseName}'.");
                Console.WriteLine("   Available items are: " + string.Join(", ", trip.Expenses.Select(e => e.Name)));
                return;
            }

            Console.WriteLine($"✅ FOUND item: {expenseToRemove.Name}. Amount: {expenseToRemove.Amount}");

            // REMOVE
            trip.Expenses.Remove(expenseToRemove);

            // RE-CALCULATE
            var newTotal = trip.Expenses.Sum(e => e.Amount);
            Console.WriteLine($"4. Old Total: {trip.TotalSpent} -> New Total: {newTotal}");
            trip.TotalSpent = newTotal;

            // SAVE
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