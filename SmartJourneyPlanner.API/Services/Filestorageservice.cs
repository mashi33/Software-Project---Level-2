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

        /// <summary>Upload a stream and return the new GridFS ObjectId as a string.</summary>
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

        /// <summary>Open a download stream by file id.</summary>
        // ✅ FIXED: GridFSDownloadStream is generic in MongoDB.Driver v3 — must use GridFSDownloadStream<ObjectId>
        public async Task<Stream> DownloadAsync(string fileId)
        {
            var objectId = new ObjectId(fileId);
            // OpenDownloadStreamAsync මගින් ලැබෙන Stream එක කෙලින්ම ලබා දීම
            return await _bucket.OpenDownloadStreamAsync(objectId);
        }
        /// <summary>Delete a file from GridFS.</summary>
        public async Task DeleteAsync(string fileId)
        {
            var objectId = new ObjectId(fileId);
            await _bucket.DeleteAsync(objectId);
        }
    }
}