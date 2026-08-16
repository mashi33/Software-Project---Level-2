using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
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

        public NotificationsController(NotificationService notificationService)
        {
            _notificationService = notificationService;
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
    }
}
