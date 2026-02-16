using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using MongoDB.Bson;

namespace SmartJourneyPlanner.Services
{
    public class DiscussionsService
    {
        private readonly IMongoCollection<DiscussionItem> _discussionsCollection;

        public DiscussionsService(IOptions<DatabaseSettings> databaseSettings)
        {
            // MongoDB Connection Setup
            var connectionString = "mongodb+srv://tripAdmin:root@tripcluster0.rdp8sze.mongodb.net/TripPlannerDB?retryWrites=true&w=majority";
            var mongoClient = new MongoClient(connectionString);
            var mongoDatabase = mongoClient.GetDatabase("TripPlannerDB");
            _discussionsCollection = mongoDatabase.GetCollection<DiscussionItem>("Discussions");
        }

        // 1. සියලුම සාකච්ඡා ලබා ගැනීම
        public async Task<List<DiscussionItem>> GetAsync() =>
            await _discussionsCollection.Find(_ => true).ToListAsync();

        // 2. ID එක අනුව සාකච්ඡාවක් ලබා ගැනීම
        public async Task<DiscussionItem?> GetAsync(string id) =>
            await _discussionsCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        // 3. නව සාකච්ඡාවක් ඇරඹීම (CreatedAt දිනය සමඟ)
        public async Task CreateAsync(DiscussionItem newDiscussion)
        {
            newDiscussion.CreatedAt = DateTime.UtcNow;
            await _discussionsCollection.InsertOneAsync(newDiscussion);
        }

        // 4. දත්ත යාවත්කාලීන කිරීම (ඔබේ Controller එකේ Error එක නිවැරදි කිරීමට මෙය අත්‍යවශ්‍යයි)
        public async Task UpdateAsync(string id, DiscussionItem updatedDiscussion)
        {
            await _discussionsCollection.ReplaceOneAsync(x => x.Id == id, updatedDiscussion);
        }

        // 5. සාකච්ඡාවක් මැකීම
        public async Task RemoveAsync(string id) =>
            await _discussionsCollection.DeleteOneAsync(x => x.Id == id);

        // 6. ඡන්දය ප්‍රකාශ කිරීමේ Logic එක (Vote Bars සඳහා)
        public async Task<bool> VoteAsync(string id, int optionIndex, string userId)
        {
            var discussion = await GetAsync(id);
            if (discussion == null) return false;

            // දැනටමත් ඡන්දය දී ඇත්නම් නතර කරන්න
            discussion.VotedUsers ??= new List<string>();
            if (discussion.VotedUsers.Contains(userId)) return false;

            if (optionIndex >= 0 && optionIndex < discussion.Options.Count)
            {
                discussion.Options[optionIndex].VoteCount++;
                discussion.VotedUsers.Add(userId);

                await UpdateAsync(id, discussion);
                return true;
            }
            return false;
        }

        // 7. අදහස් දැක්වීම (Commenting)
        public async Task AddCommentAsync(string id, CommentItem comment)
        {
            comment.CreatedAt = DateTime.UtcNow;
            var filter = Builders<DiscussionItem>.Filter.Eq(x => x.Id, id);
            var update = Builders<DiscussionItem>.Update.Push(d => d.Comments, comment);
            await _discussionsCollection.UpdateOneAsync(filter, update);
        }
    }
}