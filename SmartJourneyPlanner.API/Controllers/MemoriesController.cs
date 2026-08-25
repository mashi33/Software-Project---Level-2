using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;
using MongoDB.Driver;
using MongoDB.Bson;

namespace SmartJourneyPlanner.API.Controllers;

public record LikeRequest(
    [property: JsonPropertyName("userId")] string UserId,
    [property: JsonPropertyName("fullName")] string FullName
);

public record CommentRequest(
    [property: JsonPropertyName("userId")] string UserId,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("text")] string Text
);

[ApiController]
[Route("api/[controller]")]
public class MemoriesController : ControllerBase
{
    private readonly MemoryService _memoryService;
    private readonly ILogger<MemoriesController> _logger;
    private readonly NotificationService _notificationService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IMongoCollection<BsonDocument> _tripsCollection;

    public MemoriesController(
        MemoryService memoryService, 
        ILogger<MemoriesController> logger,
        NotificationService notificationService,
        IHubContext<ChatHub> hubContext,
        IConfiguration config)
    {   
        _memoryService = memoryService ?? throw new ArgumentNullException(nameof(memoryService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));

        var client = new MongoClient(config.GetValue<string>("DatabaseSettings:ConnectionString"));
        var database = client.GetDatabase(config.GetValue<string>("DatabaseSettings:DatabaseName"));
        _tripsCollection = database.GetCollection<BsonDocument>("Trips");
    }

// GET ALL PUBLIC MEMORIES
    [HttpGet]
    public async Task<ActionResult<List<TripMemory>>> GetPublicMemories()
    {
        try
        {
            var memories = await _memoryService.GetPublicMemoriesAsync();
            return Ok(memories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching public memories.");
            return StatusCode(500, "An internal server error occurred.");
        }
    }

// GET USER'S PRIVATE MEMORIES
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<TripMemory>>> GetUserMemories(string userId)
    {
        try
        {
            var memories = await _memoryService.GetByUserIdAsync(userId);
            return Ok(memories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching user memories.");
            return StatusCode(500, "An internal server error occurred.");
        }
    }

// GET MEMORIES FOR A TRIP (public + tripMembers only)
    [HttpGet("trip/{tripId}")]
    public async Task<ActionResult<List<TripMemory>>> GetTripMemories(string tripId, [FromQuery] string? userId = null)
    {
        try
        {
            var memories = await _memoryService.GetTripMemoriesAsync(tripId, userId);
            return Ok(memories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while fetching trip memories.");
            return StatusCode(500, "An internal server error occurred.");
        }
    }

// POST – now accepts FormData + image file → uploads to Cloudinary
    [HttpPost]
    public async Task<IActionResult> Post([FromForm] TripMemory newMemory, IFormFile? image)
    {
        try
        {
            if (image != null && image.Length > 0)
            {
                var cloudinaryService = HttpContext.RequestServices.GetRequiredService<CloudinaryService>();
                newMemory.ImageUrl = await cloudinaryService.UploadImageAsync(image);
            }

            if (string.IsNullOrWhiteSpace(newMemory.ImageUrl))
            {
                return BadRequest("Image is required.");
            }

            Console.WriteLine($"Incoming Data: {newMemory.Title}, {newMemory.LocationName}, Visibility: {newMemory.Visibility}");

            newMemory.CreatedAt = DateTime.UtcNow;

            await _memoryService.CreateAsync(newMemory);

            // Fetch the Trip to notify all members
            if (!string.IsNullOrEmpty(newMemory.TripId))
            {
                var tripFilter = Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(newMemory.TripId));
                var tripDoc = await _tripsCollection.Find(tripFilter).FirstOrDefaultAsync();
                
                if (tripDoc != null)
                {
                    var trip = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<Trip>(tripDoc);
                    var targetUsers = new HashSet<string>();

                    if (!string.IsNullOrEmpty(trip.CreatedBy)) targetUsers.Add(trip.CreatedBy);
                    if (!string.IsNullOrEmpty(trip.CreatorEmail)) targetUsers.Add(trip.CreatorEmail);
                    if (trip.Members != null)
                    {
                        foreach (var member in trip.Members)
                        {
                            if (!string.IsNullOrEmpty(member.Email)) targetUsers.Add(member.Email);
                        }
                    }

                    foreach (var userIdentifier in targetUsers)
                    {
                        var notification = new Notification
                        {
                            UserId = userIdentifier,
                            Icon = "bi-image",
                            IconColorClass = "icon-green",
                            Title = $"New memory uploaded to trip '{trip.TripName}' by {newMemory.FullName}",
                            IsRead = false,
                            LinkText = "View Gallery",
                            Route = $"/trip-summary/{trip.Id}?tab=gallery"
                        };
                        await _notificationService.CreateNotificationAsync(notification);
                        await _hubContext.Clients.Group(notification.UserId).SendAsync("ReceiveNotification", notification);
                    }
                }
            }

            return Ok(newMemory); 
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"SERVER ERROR: {ex.Message}");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _memoryService.DeleteAsync(id);

        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/like")]
    public async Task<ActionResult<TripMemory>> ToggleLike([FromRoute] string id, [FromBody] LikeRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("Memory ID is required.");
        }

        if (request == null || string.IsNullOrWhiteSpace(request.UserId))
        {
            return BadRequest("User ID is required within the request body.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("Full Name is required within the request body.");
        }

        try
        {
            _logger.LogInformation("Processing like toggle for Memory: {MemoryId} by User: {UserId} ({FullName})", id, request.UserId, request.FullName);

            var updatedMemory = await _memoryService.ToggleLikeAsync(id, request.UserId, request.FullName);

            if (updatedMemory == null)
            {
                _logger.LogWarning("Memory interaction failed. Memory with ID {MemoryId} not found.", id);
                return NotFound($"Memory with ID {id} does not exist.");
            }

            // Check if the like was ADDED (user is now in the LikedByUsers list)
            if (updatedMemory.LikedByUsers != null && updatedMemory.LikedByUsers.Contains(request.FullName))
            {
                // Do not notify if the user liked their own memory
                if (updatedMemory.UserId != request.UserId)
                {
                    var notification = new Notification
                    {
                        UserId = updatedMemory.UserId,
                        Icon = "bi-heart-fill",
                        IconColorClass = "icon-red",
                        Title = $"{request.FullName} liked your memory at {updatedMemory.LocationName}!",
                        IsRead = false,
                        LinkText = "View Memory",
                        Route = !string.IsNullOrEmpty(updatedMemory.TripId) ? $"/trip-summary/{updatedMemory.TripId}?tab=gallery" : "/social-feed"
                    };
                    
                    await _notificationService.CreateNotificationAsync(notification);
                    await _hubContext.Clients.Group(notification.UserId).SendAsync("ReceiveNotification", notification);
                }
            }

            // Broadcast real-time like update to all clients
            await _hubContext.Clients.All.SendAsync("MemoryLikeUpdated", new
            {
                memoryId = updatedMemory.Id,
                likeCount = updatedMemory.LikeCount,
                likedByUsers = updatedMemory.LikedByUsers
            });

            return Ok(updatedMemory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Critical failure during like toggle for Memory ID: {MemoryId}", id);
            return StatusCode(500, "A database concurrency or server error occurred.");
        }
    }

    [HttpGet("user/{userId}/count")]
    public async Task<IActionResult> GetUserMemoryCount(string userId)
    {
        try
        {
            int count = await _memoryService.GetCountByUserIdAsync(userId);
            return Ok(new { count = count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"SERVER ERROR: {ex.Message}");
        }
    }

    // COMMENTS 

    [HttpGet("{id}/comments")]
    public async Task<ActionResult<List<MemoryComment>>> GetComments(string id)
    {
        try
        {
            var comments = await _memoryService.GetCommentsByMemoryIdAsync(id);
            return Ok(comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching comments for memory {MemoryId}", id);
            return StatusCode(500, "An internal server error occurred.");
        }
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<MemoryComment>> AddComment([FromRoute] string id, [FromBody] CommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest("Memory ID is required.");

        if (request == null || string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest("User ID and Full Name are required.");

        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Comment text is required.");

        try
        {
            var comment = await _memoryService.AddCommentAsync(id, request.UserId, request.FullName, request.Text);

            if (comment == null)
                return NotFound("Memory not found or not public.");

            // Broadcast real-time comment update to all clients
            await _hubContext.Clients.All.SendAsync("MemoryCommentUpdated", new
            {
                memoryId = id,
                comment = comment
            });

            return Ok(comment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment to memory {MemoryId}", id);
            return StatusCode(500, "An internal server error occurred.");
        }
    }

    [HttpDelete("comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(string commentId, [FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(commentId) || string.IsNullOrWhiteSpace(userId))
            return BadRequest("Comment ID and User ID are required.");

        try
        {
            var success = await _memoryService.DeleteCommentAsync(commentId, userId);
            if (!success) return NotFound("Comment not found or you are not the owner.");
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting comment {CommentId}", commentId);
            return StatusCode(500, "An internal server error occurred.");
        }
    }
}