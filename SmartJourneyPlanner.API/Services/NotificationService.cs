using MongoDB.Driver;
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

        public NotificationService(IMongoDatabase database)
        {
            _notificationsCollection = database.GetCollection<Notification>("Notifications");
            _settingsCollection = database.GetCollection<NotificationSettings>("NotificationSettings");
        }

        public async Task<List<Notification>> GetNotificationsByUserIdAsync(string userId, string userType)
        {
            var notifications = await _notificationsCollection.Find(n => n.UserId == userId).ToListAsync();
            
            // Sort newest first
            notifications.Sort((a, b) => b.CreatedAt.CompareTo(a.CreatedAt));
            return notifications;
        }

        public async Task CreateNotificationAsync(Notification newNotification)
        {
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


    }
}
