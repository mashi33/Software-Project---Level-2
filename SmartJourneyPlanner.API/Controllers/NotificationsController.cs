using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly NotificationService _notificationService;
        private readonly IHubContext<ChatHub> _hubContext;

        public NotificationsController(NotificationService notificationService, IHubContext<ChatHub> hubContext)
        {
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<Notification>>> GetUserNotifications(string userId, [FromQuery] string userType = "Traveler")
        {
            try
            {
                var list = await _notificationService.GetNotificationsByUserIdAsync(userId, userType);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateNotification([FromBody] Notification newNotification)
        {
            try
            {
                if (newNotification == null)
                {
                    return BadRequest("Notification cannot be null.");
                }

                await _notificationService.CreateNotificationAsync(newNotification);
                await _hubContext.Clients.Group(newNotification.UserId).SendAsync("ReceiveNotification", newNotification);
                return Ok(newNotification);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            try
            {
                var result = await _notificationService.MarkAsReadAsync(id);
                if (!result)
                {
                    return NotFound($"Notification with ID {id} not found.");
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        [HttpPut("user/{userId}/read-all")]
        public async Task<IActionResult> MarkAllAsRead(string userId)
        {
            try
            {
                await _notificationService.MarkAllAsReadAsync(userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        [HttpGet("user/{userId}/settings")]
        public async Task<ActionResult<NotificationSettings>> GetSettings(string userId)
        {
            try
            {
                var settings = await _notificationService.GetNotificationSettingsAsync(userId);
                return Ok(settings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        [HttpPost("settings")]
        public async Task<IActionResult> SaveSettings([FromBody] NotificationSettings settings)
        {
            try
            {
                if (settings == null)
                {
                    return BadRequest("Settings cannot be null.");
                }

                await _notificationService.SaveNotificationSettingsAsync(settings);
                return Ok(settings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        /// <summary>
        /// ADMIN UTILITY: Returns a summary of all notifications in the database grouped by userId.
        /// Use this to inspect what data exists before running cleanup.
        /// GET /api/notifications/admin/summary
        /// </summary>
        [HttpGet("admin/summary")]
        public async Task<IActionResult> GetAllNotificationsSummary()
        {
            try
            {
                var summary = await _notificationService.GetAllNotificationsSummaryAsync();
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }

        /// <summary>
        /// ADMIN UTILITY: Deletes all hardcoded/fake/orphan notifications from the database.
        /// This removes:
        ///   - Notifications with fake userIds like "u1", "p1", etc.
        ///   - Notifications with empty/null userIds
        ///   - Notifications whose userId does not match any real user in the Users collection
        /// DELETE /api/notifications/admin/cleanup
        /// </summary>
        [HttpDelete("admin/cleanup")]
        public async Task<IActionResult> CleanupHardcodedNotifications()
        {
            try
            {
                var result = await _notificationService.CleanupHardcodedNotificationsAsync();
                return Ok(new
                {
                    message = $"Cleanup complete. {result.TotalDeleted} notifications deleted.",
                    fakeIdDeleted = result.FakeIdDeleted,
                    emptyUserIdDeleted = result.EmptyUserIdDeleted,
                    orphanDeleted = result.OrphanDeleted,
                    totalDeleted = result.TotalDeleted
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"SERVER ERROR: {ex.Message}");
            }
        }
    }
}
