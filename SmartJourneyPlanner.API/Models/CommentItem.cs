using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace SmartJourneyPlanner.Models
{
    [BsonIgnoreExtraElements]
    public class CommentItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } //ID from MongoDB

        public string TripId { get; set; } = string.Empty;

        public string User { get; set; } = "Guest User";
        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // ── PDF attachment fields (null for normal text messages) ──
        public string MessageType { get; set; } = "text";   // "text" | "pdf"
        public string? FileId { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
    }
}
