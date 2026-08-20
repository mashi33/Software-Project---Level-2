using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class MemoryService
    {
        private readonly IMongoCollection<TripMemory> _memoriesCollection;
        private readonly IMongoCollection<MemoryComment> _commentsCollection;

        public MemoryService(IConfiguration config)
        {
            var client = new MongoClient(config.GetValue<string>("DatabaseSettings:ConnectionString"));
            var database = client.GetDatabase(config.GetValue<string>("DatabaseSettings:DatabaseName"));
            _memoriesCollection = database.GetCollection<TripMemory>(config.GetValue<string>("DatabaseSettings:MemoryCollectionName"));
            _commentsCollection = database.GetCollection<MemoryComment>("MemoryComments");
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
                .Find(memory => memory.Visibility == "public" && memory.Status != "Flagged")
                .ToListAsync();

        public async Task<List<TripMemory>> GetTripMemoriesAsync(string tripId, string? userId = null) =>
            await _memoriesCollection
                .Find(memory => memory.TripId == tripId && 
                    (memory.Visibility == "public" || memory.Visibility == "tripMembers") && 
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

        // COMMENTS 

        public async Task<MemoryComment?> AddCommentAsync(string memoryId, string userId, string fullName, string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;

            var memoryFilter = Builders<TripMemory>.Filter.Eq(m => m.Id, memoryId);
            var memory = await _memoriesCollection.Find(memoryFilter).FirstOrDefaultAsync();
            if (memory == null || memory.Visibility != "public") return null;

            var comment = new MemoryComment
            {
                MemoryId = memoryId,
                UserId = userId,
                FullName = fullName,
                Text = text.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            await _commentsCollection.InsertOneAsync(comment);

            // Increment commentCount on memory
            await _memoriesCollection.UpdateOneAsync(
                memoryFilter,
                Builders<TripMemory>.Update.Inc(m => m.CommentCount, 1)
            );

            return comment;
        }

        public async Task<List<MemoryComment>> GetCommentsByMemoryIdAsync(string memoryId)
        {
            return await _commentsCollection
                .Find(c => c.MemoryId == memoryId)
                .SortByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> DeleteCommentAsync(string commentId, string userId)
        {
            var filter = Builders<MemoryComment>.Filter.And(
                Builders<MemoryComment>.Filter.Eq(c => c.Id, commentId),
                Builders<MemoryComment>.Filter.Eq(c => c.UserId, userId)
            );

            var comment = await _commentsCollection.Find(filter).FirstOrDefaultAsync();
            if (comment == null) return false;

            var result = await _commentsCollection.DeleteOneAsync(filter);
            if (result.DeletedCount == 0) return false;

            // Decrement commentCount
            await _memoriesCollection.UpdateOneAsync(
                Builders<TripMemory>.Filter.Eq(m => m.Id, comment.MemoryId),
                Builders<TripMemory>.Update.Inc(m => m.CommentCount, -1)
            );

            return true;
        }
    }
}