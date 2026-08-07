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
            Console.WriteLine($"Saving Memory: {newMemory.Title}, Visibility: {newMemory.Visibility}");
   
            await _memoriesCollection.InsertOneAsync(newMemory);
        }
        public async Task<List<TripMemory>> GetAsync() =>
        // Returns all documents; filtering is intentionally handled at controller/service level if needed
            await _memoriesCollection.Find(_ => true).ToListAsync();

        public async Task<List<TripMemory>> GetByUserIdAsync(string userId) =>
    await _memoriesCollection
        .Find(memory => memory.UserId == userId)
        .ToListAsync();

public async Task<List<TripMemory>> GetPublicMemoriesAsync() =>
    await _memoriesCollection
        .Find(memory => 
            (memory.Visibility == "public" || (string.IsNullOrEmpty(memory.Visibility) && memory.IsPublic == true)) 
            && memory.Status != "Flagged")
        .ToListAsync();

public async Task<List<TripMemory>> GetTripMemoriesAsync(string tripId, string? userId = null) =>
    await _memoriesCollection
        .Find(memory => memory.TripId == tripId && 
            ((memory.Visibility == "public") || 
             (memory.Visibility == "tripMembers") ||
             (string.IsNullOrEmpty(memory.Visibility) && memory.IsPublic == true)) && 
            memory.Status != "Flagged")
        .ToListAsync();

        public async Task<int> GetCountByUserIdAsync(string userId)
        {
            long count = await _memoriesCollection.CountDocumentsAsync(memory => memory.UserId == userId);
            return (int)count;
        }
        
        public async Task<bool> DeleteAsync(string id)
           {
              var filter = Builders<TripMemory>.Filter.Eq(memory => memory.Id, id);
              var result = await _memoriesCollection.DeleteOneAsync(filter);
    
        // Returns success flag instead of throwing to allow controller to decide HTTP response type
              return result.DeletedCount > 0;
           }   

           public async Task<TripMemory?> ToggleLikeAsync(string memoryId, string userId, string fullName)
{
    var baseFilter = Builders<TripMemory>.Filter.Eq(m => m.Id, memoryId);

    var memoryExists = await _memoriesCollection.Find(baseFilter).AnyAsync();
    if (!memoryExists) return null;

    UpdateDefinition<TripMemory> update;
    FilterDefinition<TripMemory> finalFilter;

    var userLikedFilter = Builders<TripMemory>.Filter.And(
        baseFilter,
        Builders<TripMemory>.Filter.AnyEq(m => m.LikedByUsers, fullName)
    );

    bool isAlreadyLiked = await _memoriesCollection.Find(userLikedFilter).AnyAsync();

    if (isAlreadyLiked)
    {
        finalFilter = baseFilter;
        update = Builders<TripMemory>.Update
            .Pull(m => m.LikedByUsers, fullName)
            .Inc(m => m.LikeCount, -1);
    }
    else
    {
        finalFilter = baseFilter;
        update = Builders<TripMemory>.Update
            .AddToSet(m => m.LikedByUsers, fullName)
            .Inc(m => m.LikeCount, 1);
    }

    var options = new FindOneAndUpdateOptions<TripMemory> { ReturnDocument = ReturnDocument.After };

    return await _memoriesCollection.FindOneAndUpdateAsync(finalFilter, update, options);
}
    }
}