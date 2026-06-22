using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class AchievementService
    {
        private readonly IMongoCollection<Trip> _tripsCollection;
        private readonly IMongoCollection<UserAchievementProgress> _progressCollection;

        private static readonly HashSet<string> EcoTransportModes = new(StringComparer.OrdinalIgnoreCase)
        {
            "Cycle", "Public Transport", "Walking"
        };

        private static readonly HashSet<string> SriLankaDestinations = new(StringComparer.OrdinalIgnoreCase)
        {
            "Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Anuradhapura", "Polonnaruwa",
            "Sigiriya", "Ella", "Nuwara Eliya", "Mirissa", "Trincomalee", "Batticaloa",
            "Matara", "Hikkaduwa", "Bentota", "Dambulla", "Ratnapura", "Badulla",
            "Arugam Bay", "Unawatuna", "Tangalle", "Kalutara", "Mannar", "Vavuniya",
            "Hambantota", "Puttalam", "Kurunegala", "Chilaw", "Weligama", "Pasikudah"
        };

        public static readonly List<BadgeDefinition> AllBadges = new()
        {
            new BadgeDefinition
            {
                Id = "first-step",
                Name = "First Step",
                Rank = "Bronze",
                Category = "Trip Creation",
                Description = "Create your very first trip.",
                XpReward = 100,
                Icon = "🧭",
                IconClass = "badge-bronze"
            },
            new BadgeDefinition
            {
                Id = "budget-visionary",
                Name = "Budget Visionary",
                Rank = "Bronze",
                Category = "Trip Creation",
                Description = "Create a trip with a defined budget limit.",
                XpReward = 100,
                Icon = "👛",
                IconClass = "badge-bronze"
            },
            new BadgeDefinition
            {
                Id = "squad-leader",
                Name = "Squad Leader",
                Rank = "Silver",
                Category = "Member Invitation",
                Description = "Successfully invite 3+ friends to a trip.",
                XpReward = 200,
                Icon = "👥",
                IconClass = "badge-silver"
            },
            new BadgeDefinition
            {
                Id = "eco-traveler",
                Name = "Eco-Traveler",
                Rank = "Silver",
                Category = "Sustainability",
                Description = "Choose cycle, public transport, or walking 3+ times.",
                XpReward = 200,
                Icon = "🌍",
                IconClass = "badge-silver"
            },
            new BadgeDefinition
            {
                Id = "voyage-master",
                Name = "Voyage Master",
                Rank = "Gold",
                Category = "Trip Summary",
                Description = "Complete 3 or more trips successfully.",
                XpReward = 300,
                Icon = "🚀",
                IconClass = "badge-gold"
            },
            new BadgeDefinition
            {
                Id = "island-conqueror",
                Name = "Island Conqueror",
                Rank = "Legend",
                Category = "Destinations",
                Description = "Visit 3+ destinations across Sri Lanka.",
                XpReward = 500,
                Icon = "🇱🇰",
                IconClass = "badge-legend"
            }
        };

        public AchievementService(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDb");
            _tripsCollection = database.GetCollection<Trip>("Trips");
            _progressCollection = database.GetCollection<UserAchievementProgress>("UserAchievements");
        }

        public async Task<AchievementSummaryDto> EvaluateAndGetAsync(string userId)
        {
            var userTrips = await GetUserTripsAsync(userId);
            var metrics = ComputeMetrics(userTrips);
            var progress = await GetOrCreateProgressAsync(userId);

            var newlyUnlocked = new List<string>();
            var unlockedSet = new HashSet<string>(progress.UnlockedBadgeIds);

            foreach (var badge in AllBadges)
            {
                if (unlockedSet.Contains(badge.Id)) continue;

                if (IsBadgeEarned(badge.Id, metrics))
                {
                    unlockedSet.Add(badge.Id);
                    newlyUnlocked.Add(badge.Id);
                    progress.TotalXp += badge.XpReward;
                }
            }

            if (newlyUnlocked.Count > 0)
            {
                progress.UnlockedBadgeIds = unlockedSet.ToList();
                progress.UpdatedAt = DateTime.UtcNow;
                await _progressCollection.ReplaceOneAsync(
                    p => p.UserId == userId,
                    progress,
                    new ReplaceOptions { IsUpsert = true });
            }

            return BuildSummary(progress, metrics, newlyUnlocked);
        }

        public async Task<AchievementSummaryDto> GetSummaryAsync(string userId)
        {
            var userTrips = await GetUserTripsAsync(userId);
            var metrics = ComputeMetrics(userTrips);
            var progress = await GetOrCreateProgressAsync(userId);
            return BuildSummary(progress, metrics, new List<string>());
        }

        private async Task<List<Trip>> GetUserTripsAsync(string userId)
        {
            var filter = Builders<Trip>.Filter.Regex(
                t => t.CreatedBy,
                new MongoDB.Bson.BsonRegularExpression($"^{userId}$", "i"));
            return await _tripsCollection.Find(filter).ToListAsync();
        }

        private async Task<UserAchievementProgress> GetOrCreateProgressAsync(string userId)
        {
            var progress = await _progressCollection
                .Find(p => p.UserId == userId)
                .FirstOrDefaultAsync();

            if (progress != null) return progress;

            progress = new UserAchievementProgress
            {
                UserId = userId,
                TotalXp = 0,
                UnlockedBadgeIds = new List<string>(),
                UpdatedAt = DateTime.UtcNow
            };

            await _progressCollection.InsertOneAsync(progress);
            return progress;
        }

        private static TripMetrics ComputeMetrics(List<Trip> trips)
        {
            var today = DateTime.Today;
            var completedTrips = trips.Where(t => t.EndDate.Date < today).ToList();
            var ecoTrips = trips.Count(t =>
                !string.IsNullOrWhiteSpace(t.TransportMode) &&
                EcoTransportModes.Contains(t.TransportMode.Trim()));

            var maxMembersOnTrip = trips.Any()
                ? trips.Max(t => t.Members?.Count ?? 0)
                : 0;

            var hasBudgetTrip = trips.Any(t => !string.IsNullOrWhiteSpace(t.BudgetLimit));

            var slMatched = trips
                .Select(t => t.Destination?.Trim())
                .Where(d => !string.IsNullOrWhiteSpace(d) && MatchesSriLankaDestination(d!))
                .Select(d => SriLankaDestinations.First(sl =>
                    d!.Contains(sl, StringComparison.OrdinalIgnoreCase)))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();

            var anyUniqueDest = trips
                .Select(t => t.Destination?.Trim().ToLowerInvariant())
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .Distinct()
                .Count();

            return new TripMetrics
            {
                TotalTrips = trips.Count,
                CompletedTrips = completedTrips.Count,
                EcoTransportTrips = ecoTrips,
                MaxMembersInvited = maxMembersOnTrip,
                HasBudgetTrip = hasBudgetTrip,
                SriLankaDestinationsVisited = Math.Max(slMatched, Math.Min(anyUniqueDest, 3))
            };
        }

        private static bool MatchesSriLankaDestination(string destination)
        {
            return SriLankaDestinations.Any(sl =>
                destination.Contains(sl, StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsBadgeEarned(string badgeId, TripMetrics metrics) => badgeId switch
        {
            "first-step" => metrics.TotalTrips >= 1,
            "budget-visionary" => metrics.HasBudgetTrip,
            "squad-leader" => metrics.MaxMembersInvited >= 3,
            "eco-traveler" => metrics.EcoTransportTrips >= 3,
            "voyage-master" => metrics.CompletedTrips >= 3,
            "island-conqueror" => metrics.SriLankaDestinationsVisited >= 3,
            _ => false
        };

        private static int GetCurrentProgress(string badgeId, TripMetrics metrics) => badgeId switch
        {
            "first-step" => Math.Min(metrics.TotalTrips, 1),
            "budget-visionary" => metrics.HasBudgetTrip ? 1 : 0,
            "squad-leader" => Math.Min(metrics.MaxMembersInvited, 3),
            "eco-traveler" => Math.Min(metrics.EcoTransportTrips, 3),
            "voyage-master" => Math.Min(metrics.CompletedTrips, 3),
            "island-conqueror" => Math.Min(metrics.SriLankaDestinationsVisited, 3),
            _ => 0
        };

        private static int GetTargetProgress(string badgeId) => badgeId switch
        {
            "first-step" => 1,
            "budget-visionary" => 1,
            "squad-leader" => 3,
            "eco-traveler" => 3,
            "voyage-master" => 3,
            "island-conqueror" => 3,
            _ => 1
        };

        private AchievementSummaryDto BuildSummary(
            UserAchievementProgress progress,
            TripMetrics metrics,
            List<string> newlyUnlocked)
        {
            var unlockedSet = new HashSet<string>(progress.UnlockedBadgeIds);
            var badges = AllBadges.Select(b => new BadgeProgressDto
            {
                Id = b.Id,
                Name = b.Name,
                Rank = b.Rank,
                Category = b.Category,
                Description = b.Description,
                XpReward = b.XpReward,
                Icon = b.Icon,
                IconClass = b.IconClass,
                IsUnlocked = unlockedSet.Contains(b.Id),
                CurrentProgress = GetCurrentProgress(b.Id, metrics),
                TargetProgress = GetTargetProgress(b.Id)
            }).ToList();

            var unlockedCount = badges.Count(b => b.IsUnlocked);
            var totalBadges = badges.Count;
            var level = Math.Max(1, progress.TotalXp / 150 + 1);
            var xpInCurrentLevel = progress.TotalXp % 150;
            var xpToNextLevel = 150 - xpInCurrentLevel;

            return new AchievementSummaryDto
            {
                TotalXp = progress.TotalXp,
                Level = level,
                XpToNextLevel = xpToNextLevel,
                UnlockedCount = unlockedCount,
                TotalBadges = totalBadges,
                ProgressPercent = totalBadges > 0 ? (int)Math.Round(unlockedCount * 100.0 / totalBadges) : 0,
                Badges = badges,
                NewlyUnlocked = newlyUnlocked
            };
        }

        private class TripMetrics
        {
            public int TotalTrips { get; set; }
            public int CompletedTrips { get; set; }
            public int EcoTransportTrips { get; set; }
            public int MaxMembersInvited { get; set; }
            public bool HasBudgetTrip { get; set; }
            public int SriLankaDestinationsVisited { get; set; }
        }
    }
}
