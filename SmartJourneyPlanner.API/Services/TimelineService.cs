using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class TimelineService
    {
        private readonly IMongoCollection<TimelinePlan> _timelineCollection;

        public TimelineService(IOptions<MongoDBSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            
            _timelineCollection = database.GetCollection<TimelinePlan>(settings.Value.CollectionName);
        }

        public async Task<List<TimelinePlan>> GetAsync()
        {
            try 
            {
                // We get the collection as BsonDocument to handle potential deserialization errors
                // caused by corrupted data points (e.g. literal "string" as ID).
                var rawCollection = _timelineCollection.Database.GetCollection<BsonDocument>(_timelineCollection.CollectionNamespace.CollectionName);
                var rawDocuments = await rawCollection.Find(new BsonDocument()).ToListAsync();
                var validPlans = new List<TimelinePlan>();

                foreach (BsonDocument doc in rawDocuments)
                {
                    try 
                    {
                        // Use the BsonSerializer to manually convert the BsonDocument to our model
                        var plan = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<TimelinePlan>(doc);
                        
                        // Additional safety check for the "string" ID issue
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
                        Console.WriteLine($"[TimelineService] ERROR deserializing document: {deserializeEx.Message}. Skipping document.");
                    }
                }

                Console.WriteLine($"[TimelineService] Returning {validPlans.Count} valid plans out of {rawDocuments.Count} documents.");
                return validPlans;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TimelineService] CRITICAL ERROR in GetAsync: {ex.Message}");
                return new List<TimelinePlan>();
            }
        }

        public async Task<TimelinePlan?> GetAsync(string id) =>
            await _timelineCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        public async Task CreateAsync(TimelinePlan newPlan)
        {
            Console.WriteLine($"[TimelineService] Creating new plan: {newPlan.Name} with {newPlan.Days.Count} days.");
            if (string.IsNullOrEmpty(newPlan.Id) || newPlan.Id.Equals("string", StringComparison.OrdinalIgnoreCase)) 
            {
                newPlan.Id = null;
            }
            await _timelineCollection.InsertOneAsync(newPlan);
            Console.WriteLine($"[TimelineService] Plan created with ID: {newPlan.Id}");
        }

        public async Task UpdateAsync(string id, TimelinePlan updatedPlan)
        {
            Console.WriteLine($"[TimelineService] Updating plan {id} with {updatedPlan.Days.Count} days.");
            await _timelineCollection.ReplaceOneAsync(x => x.Id == id, updatedPlan);
        }

        public async Task RemoveAsync(string id) =>
            await _timelineCollection.DeleteOneAsync(x => x.Id == id);
    }
}