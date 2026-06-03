/**
 * This service handles all database operations for the Trip Timeline using MongoDB.
 * It is responsible for actually writing to and reading from the database.
 */

using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    // This service connects our application to the MongoDB collection for trip plans
    public class TimelineService
    {
        // _timelineCollection is the direct link to the "TripTimelinePlans" table/collection in MongoDB
        private readonly IMongoCollection<TimelinePlan> _timelineCollection;

        // The constructor sets up the connection to the database using settings from appsettings.json
        public TimelineService(IOptions<MongoDBSettings> settings)
        {
            // Connect to the MongoDB server
            var client = new MongoClient(settings.Value.ConnectionString);
            
            // Access the specific database for our app
            var database = client.GetDatabase(settings.Value.DatabaseName);
            
            // We use the collection name from settings, or default to "TripTimelinePlans"
            string collectionToUse = string.IsNullOrEmpty(settings.Value.TimelineCollectionName) 
                ? "TripTimelinePlans" 
                : settings.Value.TimelineCollectionName;
                
            // Initialize the collection handler
            _timelineCollection = database.GetCollection<TimelinePlan>(collectionToUse);
        }

        /**
         * Retrieves all trip timeline plans from the database.
         * We do extra checks here to make sure "broken" or "empty" plans don't crash the app.
         */
        public async Task<List<TimelinePlan>> GetAsync()
        {
            try 
            {
                // 1. Fetch all documents from the database as raw BSON data
                var rawCollection = _timelineCollection.Database.GetCollection<BsonDocument>(_timelineCollection.CollectionNamespace.CollectionName);
                var rawDocuments = await rawCollection.Find(new BsonDocument()).ToListAsync();
                var validPlans = new List<TimelinePlan>();

                // 2. Loop through each document and try to convert it to our C# model
                foreach (BsonDocument doc in rawDocuments)
                {
                    try 
                    {
                        // Convert the database data into a TimelinePlan object
                        var plan = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<TimelinePlan>(doc);
                        
                        // Only add the plan if it has a real ID (and not just the default placeholder "string")
                        if (plan != null && !string.IsNullOrEmpty(plan.Id) && !plan.Id.Equals("string", StringComparison.OrdinalIgnoreCase))
                        {
                            validPlans.Add(plan);
                        }
                    }
                    catch (Exception deserializeEx)
                    {
                        // If one specific document is corrupted, skip it so the rest of the list still loads
                        Console.WriteLine($"Skipping a broken document: {deserializeEx.Message}");
                    }
                }

                return validPlans;
            }
            catch (Exception ex)
            {
                // If there's a serious database connection error, log it and return an empty list
                Console.WriteLine($"Database error in GetAsync: {ex.Message}");
                return new List<TimelinePlan>();
            }
        }

        /**
         * Find and return one specific trip plan using its unique ID.
         */
        public async Task<TimelinePlan?> GetAsync(string id) =>
            await _timelineCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        /**
         * Save a brand new trip plan to the MongoDB database.
         */
        public async Task CreateAsync(TimelinePlan newPlan)
        {
            try 
            {
                // If the incoming data doesn't have an ID, we create a unique one using a GUID
                if (string.IsNullOrEmpty(newPlan.Id) || newPlan.Id.Equals("string", StringComparison.OrdinalIgnoreCase)) 
                {
                    newPlan.Id = Guid.NewGuid().ToString();
                }
                
                // Insert the document into the MongoDB collection
                await _timelineCollection.InsertOneAsync(newPlan);
            }
            catch (Exception ex)
            {
                // Log any errors that happen during the insertion process
                Console.WriteLine($"Error saving new plan: {ex.Message}");
                throw; // Rethrow the error so the API Controller knows it failed
            }
        }

        /**
         * Update an existing trip plan's information (replace the old data with new data).
         */
        public async Task UpdateAsync(string id, TimelinePlan updatedPlan)
        {
            // We search for the document by ID and replace it completely with the updated version
            await _timelineCollection.ReplaceOneAsync(x => x.Id == id, updatedPlan);
        }

        /**
         * Permanently delete a trip plan from the database.
         */
        public async Task RemoveAsync(string id) =>
            await _timelineCollection.DeleteOneAsync(x => x.Id == id);
    }
}