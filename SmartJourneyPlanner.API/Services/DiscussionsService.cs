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

    // Fetch all discussions
    public virtual async Task<List<DiscussionItem>> GetAsync() =>
        await _discussionsCollection.Find(_ => true).ToListAsync();

    // Fetch discussions by TripId
    public virtual async Task<List<DiscussionItem>> GetByTripAsync(string tripId) =>
        await _discussionsCollection.Find(x => x.TripId == tripId).ToListAsync();

    // Get a single discussion by ID
    public virtual async Task<DiscussionItem?> GetAsync(string id) =>
        await _discussionsCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

    // Create a new discussion
    public virtual async Task CreateAsync(DiscussionItem newDiscussion)
    {
      newDiscussion.CreatedAt = DateTime.UtcNow;
      await _discussionsCollection.InsertOneAsync(newDiscussion);
    }

    // Update an existing discussion
    public virtual async Task UpdateAsync(string id, DiscussionItem updatedDiscussion)
    {
      await _discussionsCollection.ReplaceOneAsync(x => x.Id == id, updatedDiscussion);
    }

    // Delete a discussion (vote box)
    public virtual async Task RemoveAsync(string id) =>
        await _discussionsCollection.DeleteOneAsync(x => x.Id == id);

    // Casts a vote for a Trip-type discussion, enforcing the member limit and
    // blocking new votes once confirmed/rejected. Existing voters can always
    // change their choice, even mid-tie.
    public async Task<bool> VoteAsync(string id, int optionIndex, string userId)
    {
      var discussion = await GetAsync(id);
      if (discussion == null) return false;

      if (discussion.IsConfirmed || discussion.IsRejected) return false;

      discussion.VotedUsers ??= new List<string>();
      discussion.UserVotes ??= new List<UserVoteRecord>();

      int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 1;

      var existingVote = discussion.UserVotes.Find(v =>
          v.UserId.Trim().Equals(userId.Trim(), StringComparison.OrdinalIgnoreCase));

      if (existingVote == null)
      {
        // New voter — only allow if under the member limit
        if (discussion.UserVotes.Count >= limit) return false;
      }

      if (optionIndex >= 0 && optionIndex < discussion.Options.Count)
      {
        if (existingVote != null)
        {
          var oldOption = discussion.Options.Find(o => o.OptionText == existingVote.OptionText);
          if (oldOption != null && oldOption.VoteCount > 0) oldOption.VoteCount--;
          existingVote.OptionText = discussion.Options[optionIndex].OptionText;
        }
        else
        {
          discussion.UserVotes.Add(new UserVoteRecord { UserId = userId.Trim(), OptionText = discussion.Options[optionIndex].OptionText });

          if (!discussion.VotedUsers.Exists(u => u.Trim().Equals(userId.Trim(), StringComparison.OrdinalIgnoreCase)))
            discussion.VotedUsers.Add(userId.Trim());
        }

        discussion.Options[optionIndex].VoteCount++;
        await UpdateAsync(id, discussion);
        return true;
      }

      return false;
    }

    // Adds a comment to a discussion's embedded comment list
    public async Task AddCommentAsync(string id, CommentItem comment)
    {
      comment.CreatedAt = DateTime.UtcNow;
      var filter = Builders<DiscussionItem>.Filter.Eq(x => x.Id, id);
      var update = Builders<DiscussionItem>.Update.Push(d => d.Comments, comment);
      await _discussionsCollection.UpdateOneAsync(filter, update);
    }

    // Updates MemberLimit for all PENDING discussions of a trip (not confirmed/rejected),
    // called when a trip's member list changes so vote boxes stay in sync with the actual group size
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