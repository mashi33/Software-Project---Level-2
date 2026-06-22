using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements]
    public class UserAchievementProgress
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string UserId { get; set; } = string.Empty;
        public int TotalXp { get; set; }
        public List<string> UnlockedBadgeIds { get; set; } = new();
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class BadgeDefinition
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Rank { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int XpReward { get; set; }
        public string Icon { get; set; } = string.Empty;
        public string IconClass { get; set; } = string.Empty;
    }

    public class BadgeProgressDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Rank { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int XpReward { get; set; }
        public string Icon { get; set; } = string.Empty;
        public string IconClass { get; set; } = string.Empty;
        public bool IsUnlocked { get; set; }
        public int CurrentProgress { get; set; }
        public int TargetProgress { get; set; }
        public DateTime? UnlockedAt { get; set; }
    }

    public class AchievementSummaryDto
    {
        public int TotalXp { get; set; }
        public int Level { get; set; }
        public int XpToNextLevel { get; set; }
        public int UnlockedCount { get; set; }
        public int TotalBadges { get; set; }
        public int ProgressPercent { get; set; }
        public List<BadgeProgressDto> Badges { get; set; } = new();
        public List<string> NewlyUnlocked { get; set; } = new();
    }
}
