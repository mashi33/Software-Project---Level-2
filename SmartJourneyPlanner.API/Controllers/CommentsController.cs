using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.Controllers
{
  // Handles all API requests related to comments (chat messages) in the app
  [Route("api/[controller]")]
  [ApiController]
  public class CommentsController : ControllerBase
  {
    private readonly CommentsService _commentsService;  // Manages comment data in the database
    private readonly FileStorageService _fileStorage;   // Handles file uploads (e.g., PDFs)
    private readonly IHubContext<ChatHub> _hubContext;  // Sends real-time updates to connected clients

    // Injects the required services via dependency injection
    public CommentsController(
        CommentsService commentsService,
        FileStorageService fileStorage,
        IHubContext<ChatHub> hubContext)
    {
      _commentsService = commentsService;
      _fileStorage = fileStorage;
      _hubContext = hubContext;
    }

        // GET api/comments/all
        // Returns all comments stored in the database
        [HttpGet("all")]
        public async Task<ActionResult<List<CommentItem>>> GetAllComments()
        {
          var comments = await _commentsService.GetAsync();
          return Ok(comments);
        }

        // GET api/comments/trip/{tripId}
        // Returns only the comments that belong to a specific trip
        [HttpGet("trip/{tripId}")]
        public async Task<ActionResult<List<CommentItem>>> GetByTrip(string tripId)
        {
          try
          {
            var comments = await _commentsService.GetByTripAsync(tripId);
            return Ok(comments);
          }
          catch (MongoDB.Driver.MongoConnectionException ex)
          {
            Console.WriteLine($"[CommentsController] Mongo Connection Error: {ex.Message}");
            return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
          }
          catch (TimeoutException ex)
          {
            Console.WriteLine($"[CommentsController] Timeout: {ex.Message}");
            return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
          }
          catch (Exception ex)
          {
            Console.WriteLine($"[CommentsController] GetByTrip Error: {ex.Message}");
            return StatusCode(503, new { message = "Network error. Please check your internet connection." });
          }
        }

        // POST api/comments
        // Saves a new comment and notifies the relevant trip group in real time
        [HttpPost]
        public async Task<IActionResult> AddComment([FromBody] CommentItem comment)
        {
          try
          {
            comment.CreatedAt = DateTime.UtcNow;
            await _commentsService.CreateAsync(comment);

            if (!string.IsNullOrEmpty(comment.TripId))
            {
              await _hubContext.Clients.Group(comment.TripId).SendAsync("ReceiveComment", comment);
            }
            else
            {
              await _hubContext.Clients.All.SendAsync("ReceiveComment", comment);
            }

            return Ok(comment);
          }
          catch (MongoDB.Driver.MongoConnectionException ex)
          {
            Console.WriteLine($"[CommentsController] Mongo Connection Error: {ex.Message}");
            return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
          }
          catch (TimeoutException ex)
          {
            Console.WriteLine($"[CommentsController] Timeout: {ex.Message}");
            return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
          }
          catch (Exception ex)
          {
            Console.WriteLine($"[CommentsController] AddComment error: {ex.Message}");
            return StatusCode(503, new { message = "Network error. Please check your internet connection." });
          }
        }

        // PUT api/comments/{id}
        // Updates the text of an existing comment and notifies the relevant trip group
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(string id, [FromBody] CommentItem updatedComment)
        {
          try
          {
            var existingComment = await _commentsService.GetCommentByIdAsync(id);
            if (existingComment == null) return NotFound();

            existingComment.Text = updatedComment.Text;
            existingComment.UpdatedAt = DateTime.UtcNow;
            existingComment.IsEdited = true; // Mark the comment as edited

            await _commentsService.UpdateAsync(id, existingComment);

            if (!string.IsNullOrEmpty(existingComment.TripId))
            {
              await _hubContext.Clients.Group(existingComment.TripId).SendAsync("CommentUpdated", existingComment);
            }
            else
            {
              await _hubContext.Clients.All.SendAsync("CommentUpdated", existingComment);
            }

            return Ok(existingComment);
          }
          catch (MongoDB.Driver.MongoConnectionException ex)
          {
            Console.WriteLine($"[CommentsController] Mongo Connection Error: {ex.Message}");
            return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
          }
          catch (TimeoutException ex)
          {
            Console.WriteLine($"[CommentsController] Timeout: {ex.Message}");
            return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
          }
          catch (Exception ex)
          {
            Console.WriteLine($"[CommentsController] UpdateComment error: {ex.Message}");
            return StatusCode(503, new { message = "Network error. Please check your internet connection." });
          }
        }

        // DELETE api/comments/{id}
        // Soft-deletes a comment: clears its content and marks IsDeleted = true so the
        // record stays in the DB and the UI can show "This message was deleted".
        // Any attached PDF is still permanently removed from GridFS storage.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
          try
          {
            var comment = await _commentsService.GetCommentByIdAsync(id);
            if (comment == null) return NotFound();

            if (comment.MessageType == "pdf" && !string.IsNullOrEmpty(comment.FileId))
            {
              try
              {
                await _fileStorage.DeleteAsync(comment.FileId);
              }
              catch (Exception ex)
              {
                Console.WriteLine($"[CommentsController] GridFS delete warning: {ex.Message}");
              }
            }

            comment.IsDeleted   = true;
            comment.Text        = string.Empty;
            comment.MessageType = "text";
            comment.FileId       = null;
            comment.FileName     = null;
            comment.FileSize     = null;
            comment.UpdatedAt    = DateTime.UtcNow;

            await _commentsService.UpdateAsync(id, comment);

            if (!string.IsNullOrEmpty(comment.TripId))
            {
              await _hubContext.Clients.Group(comment.TripId).SendAsync("CommentUpdated", comment);
            }
            else
            {
              await _hubContext.Clients.All.SendAsync("CommentUpdated", comment);
            }

            return Ok(comment);
          }
          catch (MongoDB.Driver.MongoConnectionException ex)
          {
            Console.WriteLine($"[CommentsController] Mongo Connection Error: {ex.Message}");
            return StatusCode(503, new { message = "Database connection failed. Please check your internet connection." });
          }
          catch (TimeoutException ex)
          {
            Console.WriteLine($"[CommentsController] Timeout: {ex.Message}");
            return StatusCode(503, new { message = "Connection timed out. Please check your internet connection." });
          }
          catch (Exception ex)
          {
            Console.WriteLine($"[CommentsController] DeleteComment error: {ex.Message}");
            return StatusCode(503, new { message = "Network error. Please check your internet connection." });
          }
        }
  }
}