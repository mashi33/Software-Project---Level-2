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

        public async Task<List<TripMemory>> GetByUserIdAsync(string userId) =>
    await _memoriesCollection
        .Find(memory => memory.UserId == userId)
        .ToListAsync();

public async Task<List<TripMemory>> GetPublicMemoriesAsync() =>
    await _memoriesCollection
        .Find(memory => memory.IsPublic == true)
        .ToListAsync();

        // =========================================================================================
        // === ADD THIS NEW METHOD HERE ===
        // =========================================================================================
        public async Task<int> GetCountByUserIdAsync(string userId)
        {
            long count = await _memoriesCollection.CountDocumentsAsync(memory => memory.UserId == userId);
            return (int)count;
        }
        // =========================================================================================

        public async Task<bool> DeleteAsync(string id)
           {
              var filter = Builders<TripMemory>.Filter.Eq(memory => memory.Id, id);
              var result = await _memoriesCollection.DeleteOneAsync(filter);
    
        // Returns success flag instead of throwing to allow controller to decide HTTP response type
              return result.DeletedCount > 0;
           }   

           public async Task<TripMemory?> ToggleLikeAsync(string memoryId, string userId)
{
    // 1. මූලික Filter එක: අදාළ මතකය (Memory) සොයා ගැනීමට
    var baseFilter = Builders<TripMemory>.Filter.Eq(m => m.Id, memoryId);

    // 2. අදාළ මතකය Database එකේ තියෙනවාද කියලා මුලින්ම තහවුරු කරගන්න
    var memoryExists = await _memoriesCollection.Find(baseFilter).AnyAsync();
    if (!memoryExists) return null;

    UpdateDefinition<TripMemory> update;
    FilterDefinition<TripMemory> finalFilter;

    // 3. 👥 MULTI-USER CHECK: මේ යූසර් දැනටමත් LikedByUsers ලිස්ට් එකේ ඉන්නවාද කියා සිතියමෙන්ම (Database) සෙවීම
    var userLikedFilter = Builders<TripMemory>.Filter.And(
        baseFilter,
        Builders<TripMemory>.Filter.AnyEq(m => m.LikedByUsers, userId)
    );

    // Database එක ඇතුළෙන්ම කෙලින්ම පරීක්ෂා කිරීම
    bool isAlreadyLiked = await _memoriesCollection.Find(userLikedFilter).AnyAsync();

    if (isAlreadyLiked)
    {
        // ❌ පරිශීලකයා දැනටමත් Like කර ඇත්නම් -> Unlike කිරීම (Remove user and decrement count)
        finalFilter = baseFilter;
        update = Builders<TripMemory>.Update
            .Pull(m => m.LikedByUsers, userId)
            .Inc(m => m.LikeCount, -1);
    }
    else
    {
        //  පරිශීලකයා Like කර නොමැති නම් -> Like කිරීම (Atomic Add and Increment)
        finalFilter = baseFilter;
        update = Builders<TripMemory>.Update
            .AddToSet(m => m.LikedByUsers, userId)
            .Inc(m => m.LikeCount, 1);
    }

    // 4. Database එක ඇතුලෙන්ම Atomic ලෙස දත්ත වෙනස් කර, අලුත් වුණු Object එක (LikeCount එක 2, 3 වුණු) ලබා ගැනීම
    var options = new FindOneAndUpdateOptions<TripMemory> { ReturnDocument = ReturnDocument.After };
    
    return await _memoriesCollection.FindOneAndUpdateAsync(finalFilter, update, options);
}
    }
}