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
      _commentsCollection = mongoDatabase.GetCollection<CommentItem>("Comments");
    }

    // Fetch all comments in the database
    public async Task<List<CommentItem>> GetAsync() =>
        await _commentsCollection.Find(_ => true).ToListAsync();

    // Fetch all comments belonging to a specific trip
    public async Task<List<CommentItem>> GetByTripAsync(string tripId) =>
        await _commentsCollection.Find(x => x.TripId == tripId).ToListAsync();

    // Fetch a single comment by its ID
    public async Task<CommentItem?> GetCommentByIdAsync(string id) =>
        await _commentsCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

    // Insert a new comment
    public async Task CreateAsync(CommentItem newComment) =>
        await _commentsCollection.InsertOneAsync(newComment);

    // Replace an existing comment (used for both edits and soft-deletes)
    public async Task UpdateAsync(string id, CommentItem updatedComment) =>
        await _commentsCollection.ReplaceOneAsync(x => x.Id == id, updatedComment);

    // Permanently removes a comment record from the database
    public async Task DeleteCommentAsync(string id) =>
        await _commentsCollection.DeleteOneAsync(x => x.Id == id);

    public async Task RemoveAsync(string id) => await DeleteCommentAsync(id);
  }
}