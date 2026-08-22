using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using MongoDB.Bson;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.Services
{
  public class DiscussionsService
  {
    private readonly IMongoCollection<DiscussionItem> _discussionsCollection;

    public DiscussionsService(IOptions<DatabaseSettings> databaseSettings)
    {
      var mongoClient = new MongoClient(databaseSettings.Value.ConnectionString);
      var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);
      _discussionsCollection = mongoDatabase.GetCollection<DiscussionItem>(databaseSettings.Value.CollectionName);
    }

    // 1. Fetch all discussion
    public async Task<List<DiscussionItem>> GetAsync() =>
        await _discussionsCollection.Find(_ => true).ToListAsync();

    // Fetch discussions by TripId
    public async Task<List<DiscussionItem>> GetByTripAsync(string tripId) =>
        await _discussionsCollection.Find(x => x.TripId == tripId).ToListAsync();

    // 2. Get discussion according to ID
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

      // Only block if confirmed or rejected — a tie (both false) keeps voting open
      if (discussion.IsConfirmed || discussion.IsRejected) return false;

      discussion.VotedUsers ??= new List<string>();
      discussion.UserVotes ??= new List<UserVoteRecord>();

      int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 1;

      // Check if this user has voted before (case-insensitive)
      var existingVote = discussion.UserVotes.Find(v =>
          v.UserId.Trim().Equals(userId.Trim(), StringComparison.OrdinalIgnoreCase));

      if (existingVote == null)
      {
        // New voter — only allow if under the member limit
        // Existing voters (existingVote != null) can always change their vote even during a tie
        if (discussion.UserVotes.Count >= limit) return false;
      }

      if (optionIndex >= 0 && optionIndex < discussion.Options.Count)
      {
        if (existingVote != null)
        {
          // Remove the old vote count before switching
          var oldOption = discussion.Options.Find(o => o.OptionText == existingVote.OptionText);
          if (oldOption != null && oldOption.VoteCount > 0) oldOption.VoteCount--;
          existingVote.OptionText = discussion.Options[optionIndex].OptionText;
        }
        else
        {
          discussion.UserVotes.Add(new UserVoteRecord { UserId = userId.Trim(), OptionText = discussion.Options[optionIndex].OptionText });

          // Sync VotedUsers consistently using the same trim + case-insensitive check
          if (!discussion.VotedUsers.Exists(u => u.Trim().Equals(userId.Trim(), StringComparison.OrdinalIgnoreCase)))
            discussion.VotedUsers.Add(userId.Trim());
        }

        discussion.Options[optionIndex].VoteCount++;
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

        // 8. Update MemberLimit for all PENDING discussions of a trip (not confirmed/rejected)
    // Called when a trip's member list changes, so vote boxes stay in sync with actual group size
    public async Task UpdatePendingMemberLimitsAsync(string tripId, int newLimit)
    {
      var filter = Builders<DiscussionItem>.Filter.And(
          Builders<DiscussionItem>.Filter.Eq(d => d.TripId, tripId),
          Builders<DiscussionItem>.Filter.Eq(d => d.IsConfirmed, false),
          Builders<DiscussionItem>.Filter.Eq(d => d.IsRejected, false)
      );

      var update = Builders<DiscussionItem>.Update.Set(d => d.MemberLimit, newLimit);

      await _discussionsCollection.UpdateManyAsync(filter, update);
    }
  }
}