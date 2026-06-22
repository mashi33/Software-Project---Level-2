using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
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
        private readonly IMongoCollection<BsonDocument> _tripsCollection;

        public BudgetService(IOptions<MongoDBSettings> mongoDBSettings)
        {
            var mongoClient = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(mongoDBSettings.Value.DatabaseName);
            
            _budgetCollection = mongoDatabase.GetCollection<TripBudget>("Budgets");
            _tripsCollection = mongoDatabase.GetCollection<BsonDocument>("Trips");
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
            var updatePush = Builders<TripBudget>.Update.Push(t => t.Expenses, expense);
            var updateInc = Builders<TripBudget>.Update.Inc(t => t.TotalSpent, (double)expense.Amount);
            var combinedUpdate = Builders<TripBudget>.Update.Combine(updatePush, updateInc);

            await _budgetCollection.UpdateOneAsync(t => t.TripId == tripId, combinedUpdate);
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