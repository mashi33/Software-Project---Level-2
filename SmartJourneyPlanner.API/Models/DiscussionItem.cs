using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace SmartJourneyPlanner.Models
{
    [BsonIgnoreExtraElements]
    public class DiscussionItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("type")]
        [JsonPropertyName("type")]
        public string Type { get; set; } = "Place";

        [BsonElement("user")]
        [JsonPropertyName("user")]
        public string User { get; set; } = string.Empty;

        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [BsonElement("description")]
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [BsonElement("options")]
        [JsonPropertyName("options")]
        public List<VoteOption> Options { get; set; } = new List<VoteOption>();

        [BsonElement("isConfirmed")]
        [JsonPropertyName("isConfirmed")]
        public bool IsConfirmed { get; set; } = false;

        // --- Check reject status and member limit ---
        [BsonElement("isRejected")]
        [JsonPropertyName("isRejected")]
        public bool IsRejected { get; set; } = false;

        [BsonElement("memberLimit")]
        [JsonPropertyName("memberLimit")]
        public int MemberLimit { get; set; } = 5;
        // --------------------------------------------------

        [BsonElement("createdAt")]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("votedUsers")]
        [JsonPropertyName("votedUsers")]
        public List<string> VotedUsers { get; set; } = new List<string>();

        [BsonElement("userVotes")]
        [JsonPropertyName("userVotes")]
        public List<UserVoteRecord> UserVotes { get; set; } = new List<UserVoteRecord>();

        [BsonElement("comments")]
        [JsonPropertyName("comments")]
        public List<CommentItem>? Comments { get; set; } = new List<CommentItem>();
    }

    public class VoteOption
    {
        [JsonPropertyName("optionText")]
        public string OptionText { get; set; } = string.Empty;

        [JsonPropertyName("voteCount")]
        public int VoteCount { get; set; } = 0;
    }

    public class UserVoteRecord
    {
        [JsonPropertyName("userId")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("optionText")]
        public string OptionText { get; set; } = string.Empty;
    }
}