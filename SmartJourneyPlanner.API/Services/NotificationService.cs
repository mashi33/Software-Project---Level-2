using MongoDB.Driver;
using MongoDB.Bson;
using SmartJourneyPlanner.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.API.Services
{
    public class NotificationService
    {
        private readonly IMongoCollection<Notification> _notificationsCollection;
        private readonly IMongoCollection<NotificationSettings> _settingsCollection;
        private readonly IMongoCollection<User> _usersCollection;

        public NotificationService(IMongoDatabase database)
        {
            _notificationsCollection = database.GetCollection<Notification>("Notifications");
            _settingsCollection = database.GetCollection<NotificationSettings>("NotificationSettings");
            _usersCollection = database.GetCollection<User>("Users");
        }

        public async Task<List<Notification>> GetNotificationsByUserIdAsync(string userId, string userType)
        {
            if (string.IsNullOrEmpty(userId))
                return new List<Notification>();

            // Find user to match both ObjectId and Email
            var userFilter = Builders<User>.Filter.Or(
                Builders<User>.Filter.Eq(u => u.Id, userId),
                Builders<User>.Filter.Eq(u => u.Email, userId)
            );
            var user = await _usersCollection.Find(userFilter).FirstOrDefaultAsync();
            var targetId = user?.Id ?? userId;
            var targetEmail = user?.Email;

            var filter = !string.IsNullOrEmpty(targetEmail)
                ? Builders<Notification>.Filter.Or(
                    Builders<Notification>.Filter.Eq(n => n.UserId, targetId),
                    Builders<Notification>.Filter.Eq(n => n.UserId, targetEmail)
                  )
                : Builders<Notification>.Filter.Eq(n => n.UserId, targetId);

            var notifications = await _notificationsCollection.Find(filter).ToListAsync();
            
            // Sort newest first
            notifications.Sort((a, b) => b.CreatedAt.CompareTo(a.CreatedAt));
            return notifications;
        }

        public async Task CreateNotificationAsync(Notification newNotification)
        {
            if (!string.IsNullOrEmpty(newNotification.UserId) && newNotification.UserId.Contains("@"))
            {
                var cleanEmail = newNotification.UserId.Trim();
                var emailFilter = Builders<User>.Filter.Regex(
                    u => u.Email, 
                    new MongoDB.Bson.BsonRegularExpression($"^{System.Text.RegularExpressions.Regex.Escape(cleanEmail)}$", "i")
                );
                var user = await _usersCollection.Find(emailFilter).FirstOrDefaultAsync();
                if (user != null && !string.IsNullOrEmpty(user.Id))
                {
                    newNotification.UserId = user.Id;
                }
            }

            newNotification.CreatedAt = DateTime.UtcNow;
            await _notificationsCollection.InsertOneAsync(newNotification);
        }

        public async Task<bool> MarkAsReadAsync(string id)
        {
            var filter = Builders<Notification>.Filter.Eq(n => n.Id, id);
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            var result = await _notificationsCollection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> MarkAllAsReadAsync(string userId)
        {
            var filter = Builders<Notification>.Filter.Eq(n => n.UserId, userId);
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            var result = await _notificationsCollection.UpdateManyAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task<NotificationSettings> GetNotificationSettingsAsync(string userId)
        {
            var settings = await _settingsCollection.Find(s => s.UserId == userId).FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new NotificationSettings { UserId = userId };
                await _settingsCollection.InsertOneAsync(settings);
            }
            return settings;
        }

        public async Task SaveNotificationSettingsAsync(NotificationSettings settings)
        {
            var filter = Builders<NotificationSettings>.Filter.Eq(s => s.UserId, settings.UserId);
            var existing = await _settingsCollection.Find(filter).FirstOrDefaultAsync();

            if (existing == null)
            {
                await _settingsCollection.InsertOneAsync(settings);
            }
            else
            {
                settings.Id = existing.Id;
                await _settingsCollection.ReplaceOneAsync(filter, settings);
            }
        }

        /// <summary>
        /// Deletes all notifications that have hardcoded/fake data:
        /// 1. UserId is a known fake/mock ID (e.g. "u1", "p1")
        /// 2. UserId is empty or null
        /// 3. UserId does not match any real user in the Users collection
        /// Returns a summary of what was deleted.
        /// </summary>
        public async Task<CleanupResult> CleanupHardcodedNotificationsAsync()
        {
            var result = new CleanupResult();

            // Step 1: Delete notifications with known hardcoded/fake userIds
            var fakeUserIds = new List<string> { "u1", "p1", "p2", "p3", "p4", "test", "mock", "fake", "admin" };
            var fakeIdFilter = Builders<Notification>.Filter.In(n => n.UserId, fakeUserIds);
            var fakeDeleted = await _notificationsCollection.DeleteManyAsync(fakeIdFilter);
            result.FakeIdDeleted = (int)fakeDeleted.DeletedCount;

            // Step 2: Delete notifications where UserId is null or empty
            var emptyUserIdFilter = Builders<Notification>.Filter.Or(
                Builders<Notification>.Filter.Eq(n => n.UserId, ""),
                Builders<Notification>.Filter.Eq(n => n.UserId, null)
            );
            var emptyDeleted = await _notificationsCollection.DeleteManyAsync(emptyUserIdFilter);
            result.EmptyUserIdDeleted = (int)emptyDeleted.DeletedCount;

            // Step 3: Find all notifications with userIds that don't exist in the Users collection
            var allNotifications = await _notificationsCollection.Find(_ => true).ToListAsync();
            var distinctUserIds = allNotifications.Select(n => n.UserId).Distinct().ToList();

            var orphanNotificationIds = new List<string>();
            foreach (var uid in distinctUserIds)
            {
                if (string.IsNullOrEmpty(uid)) continue;

                // Try to find this userId as a MongoDB ObjectId in Users
                bool userExists = false;

                // Check if it's a valid ObjectId format (24 hex chars)
                if (uid.Length == 24 && uid.All(c => "0123456789abcdefABCDEF".Contains(c)))
                {
                    var userById = await _usersCollection.Find(u => u.Id == uid).FirstOrDefaultAsync();
                    userExists = userById != null;
                }
                else if (uid.Contains("@"))
                {
                    // It's an email — check if a user with this email exists
                    var userByEmail = await _usersCollection.Find(u => u.Email == uid).FirstOrDefaultAsync();
                    userExists = userByEmail != null;
                }
                // else: it's some other unrecognized format — treat as orphan

                if (!userExists)
                {
                    var orphans = allNotifications
                        .Where(n => n.UserId == uid && !string.IsNullOrEmpty(n.Id))
                        .Select(n => n.Id!)
                        .ToList();
                    orphanNotificationIds.AddRange(orphans);
                }
            }

            if (orphanNotificationIds.Any())
            {
                var orphanFilter = Builders<Notification>.Filter.In(n => n.Id, orphanNotificationIds);
                var orphanDeleted = await _notificationsCollection.DeleteManyAsync(orphanFilter);
                result.OrphanDeleted = (int)orphanDeleted.DeletedCount;
            }

            result.TotalDeleted = result.FakeIdDeleted + result.EmptyUserIdDeleted + result.OrphanDeleted;
            return result;
        }

        /// <summary>
        /// Returns a count of all notifications grouped by userId — useful for debugging.
        /// </summary>
        public async Task<List<NotificationUserSummary>> GetAllNotificationsSummaryAsync()
        {
            var all = await _notificationsCollection.Find(_ => true).ToListAsync();
            var summary = all
                .GroupBy(n => n.UserId)
                .Select(g => new NotificationUserSummary
                {
                    UserId = g.Key,
                    Count = g.Count(),
                    UnreadCount = g.Count(n => !n.IsRead),
                    OldestCreatedAt = g.Min(n => n.CreatedAt),
                    NewestCreatedAt = g.Max(n => n.CreatedAt)
                })
                .OrderBy(s => s.UserId)
                .ToList();
            return summary;
        }
    }

    public class CleanupResult
    {
        public int FakeIdDeleted { get; set; }
        public int EmptyUserIdDeleted { get; set; }
        public int OrphanDeleted { get; set; }
        public int TotalDeleted { get; set; }
    }

    public class NotificationUserSummary
    {
        public string UserId { get; set; } = string.Empty;
        public int Count { get; set; }
        public int UnreadCount { get; set; }
        public DateTime OldestCreatedAt { get; set; }
        public DateTime NewestCreatedAt { get; set; }
    }
}
