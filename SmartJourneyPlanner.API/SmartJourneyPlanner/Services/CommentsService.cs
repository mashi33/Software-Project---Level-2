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

        // සියලුම පණිවිඩ ලබා ගැනීමට
        public async Task<List<CommentItem>> GetAsync() =>
            await _commentsCollection.Find(_ => true).ToListAsync();

        // පණිවිඩයේ ID එකෙන් පණිවිඩය සෙවීමට (මෙය Controller එකේ Error එක නැති කිරීමට අත්‍යවශ්‍යයි)
        public async Task<CommentItem?> GetCommentByIdAsync(string id) =>
            await _commentsCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        // අලුත් පණිවිඩයක් Save කිරීමට
        public async Task CreateAsync(CommentItem newComment) =>
            await _commentsCollection.InsertOneAsync(newComment);

        // පණිවිඩයක් යාවත්කාලීන (Update) කිරීමට අලුතින් එක් කළ කොටස
        public async Task UpdateAsync(string id, CommentItem updatedComment) =>
            await _commentsCollection.ReplaceOneAsync(x => x.Id == id, updatedComment);

        // පණිවිඩයක් මැකීමට
        public async Task DeleteCommentAsync(string id) =>
            await _commentsCollection.DeleteOneAsync(x => x.Id == id);

        // පරණ RemoveAsync එක වෙනුවට DeleteCommentAsync භාවිතා කළ හැක
        public async Task RemoveAsync(string id) => await DeleteCommentAsync(id);
    }
}