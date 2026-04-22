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
      // ✅ Configuration (appsettings.json) මගින් දත්ත ලබා ගැනීම
      var mongoClient = new MongoClient(databaseSettings.Value.ConnectionString);
      var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);

      // ✅ Collection එක ලබා ගැනීම (DatabaseSettings හි CollectionName එක "Discussions" ලෙස තිබිය යුතුය)
      _discussionsCollection = mongoDatabase.GetCollection<DiscussionItem>(databaseSettings.Value.CollectionName);
    }

    // 1. Fetch all discussion
    public async Task<List<DiscussionItem>> GetAsync() =>
        await _discussionsCollection.Find(_ => true).ToListAsync();

    // 2. Get new discussion according to ID
    public async Task<DiscussionItem?> GetAsync(string id) =>
        await _discussionsCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

    // 3. Begin new discussion (CreatedAt with date)
    public async Task CreateAsync(DiscussionItem newDiscussion)
    {
      newDiscussion.CreatedAt = DateTime.UtcNow;
      await _discussionsCollection.InsertOneAsync(newDiscussion);
    }

    // 4. update data
    public async Task UpdateAsync(string id, DiscussionItem updatedDiscussion)
    {
      await _discussionsCollection.ReplaceOneAsync(x => x.Id == id, updatedDiscussion);
    }

    // 5. manual deletion of vote box
    public async Task RemoveAsync(string id) =>
        await _discussionsCollection.DeleteOneAsync(x => x.Id == id);

    // 6. vote casting Logic for trip (Updated with Limit & Status Check)
    public async Task<bool> VoteAsync(string id, int optionIndex, string userId)
    {
      var discussion = await GetAsync(id);
      if (discussion == null) return false;

      // If vote box confirmed or rejected, stop count votes
      if (discussion.IsConfirmed || discussion.IsRejected) return false;

      discussion.VotedUsers ??= new List<string>();

      // If already provide vote or member limit <= vote count, stop count votes
      if (discussion.VotedUsers.Contains(userId)) return false;

      int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 5;
      if (discussion.VotedUsers.Count >= limit) return false;

      if (optionIndex >= 0 && optionIndex < discussion.Options.Count)
      {
        discussion.Options[optionIndex].VoteCount++;
        discussion.VotedUsers.Add(userId);

        await UpdateAsync(id, discussion);
        return true;
      }
      return false;
    }

    // 7. commenting (messaging)
    public async Task AddCommentAsync(string id, CommentItem comment)
    {
      comment.CreatedAt = DateTime.UtcNow;
      var filter = Builders<DiscussionItem>.Filter.Eq(x => x.Id, id);
      var update = Builders<DiscussionItem>.Update.Push(d => d.Comments, comment);
      await _discussionsCollection.UpdateOneAsync(filter, update);
    }
  }
}
