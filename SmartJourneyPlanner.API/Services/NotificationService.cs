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
            
            if (notifications.Count == 0)
            {
                // Seed default mock notifications if first time
                var defaultNotifications = GetDefaultNotifications(userId, userType);
                await _notificationsCollection.InsertManyAsync(defaultNotifications);
                
                notifications = await _notificationsCollection.Find(n => n.UserId == userId).ToListAsync();
            }
            
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

        private List<Notification> GetDefaultNotifications(string userId, string userType)
        {
            var list = new List<Notification>();
            var now = DateTime.UtcNow;

            if (userType == "TransportProvider" || userType == "Provider")
            {
                list.Add(new Notification { UserId = userId, Icon = "bi-card-list", IconColorClass = "icon-blue", Title = "New booking request received from traveler Dinuri for Toyota KDH", Time = "30 mins ago", CreatedAt = now.AddMinutes(-30), IsRead = false, LinkText = "View Request", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-x-circle-fill", IconColorClass = "icon-red", Title = "Booking request #B102 has been cancelled by traveler Sasini", Time = "3 hours ago", CreatedAt = now.AddHours(-3), IsRead = false, LinkText = "Check Status", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-check-circle-fill", IconColorClass = "icon-green", Title = "Booking #B105 with traveler Sandali has been completed. Check your dashboard statistics!", Time = "12 hours ago", CreatedAt = now.AddHours(-12), IsRead = true, LinkText = "View Stats", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-star-fill", IconColorClass = "icon-orange", Title = "Traveler Malpawani Poornima left a 5-star review for your Toyota Axio", Time = "1 day ago", CreatedAt = now.AddDays(-1), IsRead = true, LinkText = "View Review", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-patch-check-fill", IconColorClass = "icon-green", Title = "Your vehicle Toyota KDH listing has been approved by the administrator and is now active!", Time = "3 days ago", CreatedAt = now.AddDays(-3), IsRead = true, LinkText = "Manage Fleet", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-exclamation-octagon-fill", IconColorClass = "icon-red", Title = "Your vehicle Honda Vezel listing request was rejected by the administrator. Please update details and re-submit", Time = "5 days ago", CreatedAt = now.AddDays(-5), IsRead = true, LinkText = "Edit Listing", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-clock-history", IconColorClass = "icon-green", Title = "Reminder: Booking #B102 starts tomorrow morning at 6:00 AM. Traveler Contact: +94771234567", Time = "1 week ago", CreatedAt = now.AddDays(-7), IsRead = true, LinkText = "View Details", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-exclamation-triangle-fill", IconColorClass = "icon-orange", Title = "Action Required: You have a pending booking request from traveler Sandali waiting for more than 24 hours", Time = "1 week ago", CreatedAt = now.AddDays(-7).AddHours(-1), IsRead = true, LinkText = "Accept/Reject", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-info-circle-fill", IconColorClass = "icon-blue", Title = "System update: New service fee rules are now active on your dashboard", Time = "2 weeks ago", CreatedAt = now.AddDays(-14), IsRead = true, LinkText = "Read Updates", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-card-list", IconColorClass = "icon-blue", Title = "New booking request received from traveler Nimasha for Honda Vezel", Time = "2 weeks ago", CreatedAt = now.AddDays(-14).AddHours(-2), IsRead = true, LinkText = "View Request", Route = "/provider-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-star-fill", IconColorClass = "icon-orange", Title = "Traveler Sandali Poornima left a 4-star review for your KDH Van", Time = "3 weeks ago", CreatedAt = now.AddDays(-21), IsRead = true, LinkText = "View Review", Route = "/provider-dashboard" });
            }
            else
            {
                list.Add(new Notification { UserId = userId, Icon = "bi-calendar-event", IconColorClass = "icon-blue", Title = "Due on Monday, 15 June 2026, 8:00 AM: Trip to Ella starting", Time = "2 hours ago", CreatedAt = now.AddHours(-2), IsRead = false, LinkText = "View Trip", Route = "/traveller-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-check-circle-fill", IconColorClass = "icon-green", Title = "Your booking for Honda Vezel has been confirmed by provider", Time = "1 day 4 hours ago", CreatedAt = now.AddDays(-1).AddHours(-4), IsRead = false, LinkText = "View Booking", Route = "/transport" });
                list.Add(new Notification { UserId = userId, Icon = "bi-cloud-rain-fill", IconColorClass = "icon-blue", Title = "New weather advisory: Heavy rain expected in Nuwara Eliya tomorrow", Time = "3 days ago", CreatedAt = now.AddDays(-3), IsRead = true, LinkText = "Check Weather", Route = "/weather" });
                list.Add(new Notification { UserId = userId, Icon = "bi-camera-fill", IconColorClass = "icon-orange", Title = "Don't forget to add memories to your recent trip to Galle!", Time = "5 days ago", CreatedAt = now.AddDays(-5), IsRead = true, LinkText = "Add Memory", Route = "/memories" });
                list.Add(new Notification { UserId = userId, Icon = "bi-exclamation-triangle-fill", IconColorClass = "icon-red", Title = "Budget alert: You have reached 80% of your estimated trip budget", Time = "6 days ago", CreatedAt = now.AddDays(-6), IsRead = true, LinkText = "View Budget", Route = "/budget" });
                list.Add(new Notification { UserId = userId, Icon = "bi-check-circle-fill", IconColorClass = "icon-green", Title = "Your booking request #B104 has been accepted by provider Nimal", Time = "1 week ago", CreatedAt = now.AddDays(-7), IsRead = true, LinkText = "View Booking", Route = "/transport" });
                list.Add(new Notification { UserId = userId, Icon = "bi-calendar-check", IconColorClass = "icon-blue", Title = "Reminder: Your trip to Galle starts in 2 days. Check your checklist!", Time = "1 week 1 day ago", CreatedAt = now.AddDays(-8), IsRead = true, LinkText = "View Checklist", Route = "/traveller-dashboard" });
                list.Add(new Notification { UserId = userId, Icon = "bi-cloud-wind", IconColorClass = "icon-blue", Title = "New weather advisory: Heavy wind expected in Ella tomorrow morning", Time = "1 week 3 days ago", CreatedAt = now.AddDays(-10), IsRead = true, LinkText = "Check Weather", Route = "/weather" });
                list.Add(new Notification { UserId = userId, Icon = "bi-exclamation-triangle-fill", IconColorClass = "icon-red", Title = "Budget alert: You have reached 95% of your estimated trip budget", Time = "2 weeks ago", CreatedAt = now.AddDays(-14), IsRead = true, LinkText = "Manage Expenses", Route = "/budget" });
                list.Add(new Notification { UserId = userId, Icon = "bi-shield-check", IconColorClass = "icon-green", Title = "System update: New traveler security policies have been updated", Time = "3 weeks ago", CreatedAt = now.AddDays(-21), IsRead = true, LinkText = "Read Security", Route = "/traveller-dashboard" });
            }

            return list;
        }
    }
}
