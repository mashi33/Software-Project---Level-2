using Microsoft.Extensions.Options;
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
            
            _timelineCollection = database.GetCollection<TimelinePlan>("TimelineHierarchy");
        }

        public async Task<List<TimelinePlan>> GetAsync()
        {
            var plans = await _timelineCollection.Find(_ => true).ToListAsync();
            Console.WriteLine($"[TimelineService] Found {plans.Count} plans in MongoDB.");
            return plans;
        }

        public async Task<TimelinePlan?> GetAsync(string id) =>
            await _timelineCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        public async Task CreateAsync(TimelinePlan newPlan)
        {
            Console.WriteLine($"[TimelineService] Creating new plan: {newPlan.Name} with {newPlan.Days.Count} days.");
            if (string.IsNullOrEmpty(newPlan.Id)) 
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