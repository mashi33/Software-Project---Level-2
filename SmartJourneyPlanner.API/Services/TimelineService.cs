// This service handles all database operations for the Trip Timeline using MongoDB.

using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    // This service connects our application to the MongoDB collection for trip plans
    public class TimelineService
    {
        private readonly IMongoCollection<TimelinePlan> _timelineCollection;

        // The constructor sets up the connection to the database
        public TimelineService(IOptions<MongoDBSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            
            // We use the collection name from settings, or default to "TripTimelinePlans"
            string collectionToUse = string.IsNullOrEmpty(settings.Value.TimelineCollectionName) 
                ? "TripTimelinePlans" 
                : settings.Value.TimelineCollectionName;
                
            _timelineCollection = database.GetCollection<TimelinePlan>(collectionToUse);
        }

        // Retrieves all trip timeline plans from the database
        public async Task<List<TimelinePlan>> GetAsync()
        {
            try 
            {
                // We fetch all documents as raw BSON first to make sure we can handle any data issues
                var rawCollection = _timelineCollection.Database.GetCollection<BsonDocument>(_timelineCollection.CollectionNamespace.CollectionName);
                var rawDocuments = await rawCollection.Find(new BsonDocument()).ToListAsync();
                var validPlans = new List<TimelinePlan>();

                foreach (BsonDocument doc in rawDocuments)
                {
                    try 
                    {
                        // Try to convert (deserialize) the raw data into our C# TimelinePlan model
                        var plan = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<TimelinePlan>(doc);
                        
                        // We only add the plan if it has a valid ID (not empty and not a placeholder "string")
                        if (plan != null && !string.IsNullOrEmpty(plan.Id) && !plan.Id.Equals("string", StringComparison.OrdinalIgnoreCase))
                        {
                            validPlans.Add(plan);
                        }
                    }
                    catch (Exception deserializeEx)
                    {
                        // If one document is "broken", we skip it and continue with the others
                        Console.WriteLine($"Skipping a broken document: {deserializeEx.Message}");
                    }
                }

                return validPlans;
            }
            catch (Exception ex)
            {
                // If the entire database fetch fails, we log it and return an empty list
                Console.WriteLine($"Database error in GetAsync: {ex.Message}");
                return new List<TimelinePlan>();
            }
        }

        // Find and return one specific trip plan using its ID
        public async Task<TimelinePlan?> GetAsync(string id) =>
            await _timelineCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        // Save a brand new trip plan to the MongoDB database
        public async Task CreateAsync(TimelinePlan newPlan)
        {
            try 
            {
                // If the ID is missing or is just a placeholder "string", we generate a new unique ID
                if (string.IsNullOrEmpty(newPlan.Id) || newPlan.Id.Equals("string", StringComparison.OrdinalIgnoreCase)) 
                {
                    newPlan.Id = Guid.NewGuid().ToString();
                }
                
                // Insert the new plan into the collection
                await _timelineCollection.InsertOneAsync(newPlan);
            }
            catch (Exception ex)
            {
                // Log any errors that happen during the saving process
                Console.WriteLine($"Error saving new plan: {ex.Message}");
                throw; // Rethrow the error so the controller knows it failed
            }
        }

        // Update an existing trip plan's information in the database
        public async Task UpdateAsync(string id, TimelinePlan updatedPlan)
        {
            await _timelineCollection.ReplaceOneAsync(x => x.Id == id, updatedPlan);
        }

        // Permanently delete a trip plan from the database using its ID
        public async Task RemoveAsync(string id) =>
            await _timelineCollection.DeleteOneAsync(x => x.Id == id);
    }
}