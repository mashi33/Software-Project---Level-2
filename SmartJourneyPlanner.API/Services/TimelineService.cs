// This service handles all database operations for the Trip Timeline using MongoDB.

using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class TimelineService
    {
        // The collection in MongoDB where timeline plans are stored
        private readonly IMongoCollection<TimelinePlan> _timelineCollection;

        // Constructor: Connects to MongoDB using settings from appsettings.json
        public TimelineService(IOptions<MongoDBSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            
            // Use TimelineCollectionName to prevent mixing data, or default to a fresh "TripTimelinePlans" collection
            string collectionToUse = string.IsNullOrEmpty(settings.Value.TimelineCollectionName) 
                ? "TripTimelinePlans" 
                : settings.Value.TimelineCollectionName;
                
            _timelineCollection = database.GetCollection<TimelinePlan>(collectionToUse);
        }

        // Retrieves all timeline plans from the database
        public async Task<List<TimelinePlan>> GetAsync()
        {
            try 
            {
                // We read the collection as BsonDocument first to handle any data that might be "broken"
                var rawCollection = _timelineCollection.Database.GetCollection<BsonDocument>(_timelineCollection.CollectionNamespace.CollectionName);
                var rawDocuments = await rawCollection.Find(new BsonDocument()).ToListAsync();
                var validPlans = new List<TimelinePlan>();

                foreach (BsonDocument doc in rawDocuments)
                {
                    try 
                    {
                        // Try to convert the raw database document into our TimelinePlan model
                        var plan = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<TimelinePlan>(doc);
                        
                        // Check if the plan is valid and doesn't have a placeholder "string" as its ID
                        if (plan != null && !string.IsNullOrEmpty(plan.Id) && !plan.Id.Equals("string", StringComparison.OrdinalIgnoreCase))
                        {
                            validPlans.Add(plan);
                        }
                        else 
                        {
                            Console.WriteLine($"[TimelineService] Skipping plan with invalid/placeholder ID: {plan?.Id ?? "null"}");
                        }
                    }
                    catch (Exception deserializeEx)
                    {
                        // If one document is broken, we skip it and continue with the others
                        Console.WriteLine($"[TimelineService] ERROR deserializing document: {deserializeEx.Message}. Skipping document.");
                    }
                }

                Console.WriteLine($"[TimelineService] Returning {validPlans.Count} valid plans out of {rawDocuments.Count} documents.");
                return validPlans;
            }
            catch (Exception ex)
            {
                // Log any critical errors that happen during the database fetch
                Console.WriteLine($"[TimelineService] CRITICAL ERROR in GetAsync: {ex.Message}");
                return new List<TimelinePlan>();
            }
        }

        // Retrieves a single timeline plan by its ID
        public async Task<TimelinePlan?> GetAsync(string id) =>
            await _timelineCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        // Saves a new timeline plan to the database
        public async Task CreateAsync(TimelinePlan newPlan)
        {
            try 
            {
                Console.WriteLine($"[TimelineService] Creating new plan: {newPlan.Name} with {newPlan.Days.Count} days.");
                
                // If the ID is empty or just says "string" (from Swagger), we generate a unique GUID string
                if (string.IsNullOrEmpty(newPlan.Id) || newPlan.Id.Equals("string", StringComparison.OrdinalIgnoreCase)) 
                {
                    newPlan.Id = Guid.NewGuid().ToString();
                }
                
                await _timelineCollection.InsertOneAsync(newPlan);
                Console.WriteLine($"[TimelineService] Plan created with ID: {newPlan.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TimelineService] CRITICAL ERROR during CreateAsync: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                throw; // Rethrow so the controller catches it
            }
        }

        // Updates an existing timeline plan in the database
        public async Task UpdateAsync(string id, TimelinePlan updatedPlan)
        {
            Console.WriteLine($"[TimelineService] Updating plan {id} with {updatedPlan.Days.Count} days.");
            await _timelineCollection.ReplaceOneAsync(x => x.Id == id, updatedPlan);
        }

        // Removes a timeline plan from the database by its ID
        public async Task RemoveAsync(string id) =>
            await _timelineCollection.DeleteOneAsync(x => x.Id == id);
    }
}