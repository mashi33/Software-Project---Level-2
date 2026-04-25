using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Services
{
  public class CommentsService
  {
    private readonly IMongoCollection<CommentItem> _commentsCollection;

    public CommentsService(IOptions<DatabaseSettings> databaseSettings)
    {
      var mongoClient = new MongoClient(databaseSettings.Value.ConnectionString);
      var mongoDatabase = mongoClient.GetDatabase(databaseSettings.Value.DatabaseName);

      // MongoDB Collection: Comments
      _commentsCollection = mongoDatabase.GetCollection<CommentItem>("Comments");
    }

    // Receive all messages
    public async Task<List<CommentItem>> GetAsync() =>
        await _commentsCollection.Find(_ => true).ToListAsync();

    // Retrieves all comments associated with a specific Trip ID
    public async Task<List<CommentItem>> GetByTripAsync(string tripId) =>
        await _commentsCollection.Find(x => x.TripId == tripId).ToListAsync();

    // Search messages using message ID (comment id)
    public async Task<CommentItem?> GetCommentByIdAsync(string id) =>
        await _commentsCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

    // Save new messages
    public async Task CreateAsync(CommentItem newComment) =>
        await _commentsCollection.InsertOneAsync(newComment);

    // Update messages
    public async Task UpdateAsync(string id, CommentItem updatedComment) =>
        await _commentsCollection.ReplaceOneAsync(x => x.Id == id, updatedComment);

    // Delete messages
    public async Task DeleteCommentAsync(string id) =>
        await _commentsCollection.DeleteOneAsync(x => x.Id == id);

    public async Task RemoveAsync(string id) => await DeleteCommentAsync(id);
  }
}
