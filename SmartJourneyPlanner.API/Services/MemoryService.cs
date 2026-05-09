using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class MemoryService
    {
        private readonly IMongoCollection<TripMemory> _memoriesCollection;

        public MemoryService(IConfiguration config)
        {
            var client = new MongoClient(config.GetValue<string>("DatabaseSettings:ConnectionString"));
            var database = client.GetDatabase(config.GetValue<string>("DatabaseSettings:DatabaseName"));
            _memoriesCollection = database.GetCollection<TripMemory>(config.GetValue<string>("DatabaseSettings:MemoryCollectionName"));
        }

        public async Task CreateAsync(TripMemory newMemory)
        {
    
            if (newMemory == null)
            {
                throw new ArgumentNullException(nameof(newMemory), "Memory object cannot be null.");
            }
            Console.WriteLine($"Saving Memory: {newMemory.Title}, IsPublic: {newMemory.IsPublic}");
   
            await _memoriesCollection.InsertOneAsync(newMemory);
        }
        public async Task<List<TripMemory>> GetAsync() =>
        // Returns all documents; filtering is intentionally handled at controller/service level if needed
            await _memoriesCollection.Find(_ => true).ToListAsync();

        public async Task<bool> DeleteAsync(string id)
           {
              var filter = Builders<TripMemory>.Filter.Eq(memory => memory.Id, id);
              var result = await _memoriesCollection.DeleteOneAsync(filter);
    
        // Returns success flag instead of throwing to allow controller to decide HTTP response type
              return result.DeletedCount > 0;
           }    
    }
}