using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using System;
using System.IO;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Services
{
    public class FileStorageService
    {
        private readonly GridFSBucket _bucket;

        public FileStorageService(IMongoDatabase database)
        {
            _bucket = new GridFSBucket(database, new GridFSBucketOptions
            {
                BucketName = "chat_files"
            });
        }

        //Upload a stream and return the new GridFS ObjectId as a string.
        public async Task<string> UploadAsync(Stream stream, string fileName)
        {
            var options = new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "contentType", "application/pdf" },
                    { "uploadedAt",  DateTime.UtcNow   }
                }
            };

            var id = await _bucket.UploadFromStreamAsync(fileName, stream, options);
            return id.ToString();
        }

        // Open a download stream by file id.
        // ✅ FIXED: GridFSDownloadStream is generic in MongoDB.Driver v3 — must use GridFSDownloadStream<ObjectId>
        public async Task<Stream> DownloadAsync(string fileId)
        {
            var objectId = new ObjectId(fileId);
            return await _bucket.OpenDownloadStreamAsync(objectId);
        }
        //Delete a file from GridFS.
        public async Task DeleteAsync(string fileId)
        {
            var objectId = new ObjectId(fileId);
            await _bucket.DeleteAsync(objectId);
        }
    }
}