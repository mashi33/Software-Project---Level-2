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
      catch (Exception)
      {
        return StatusCode(500, "Can not fetch comments for this trip.");
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

        // Send the new comment only to the trip group, or to everyone if no trip is linked
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
      catch (Exception ex)
      {
        Console.WriteLine($"[CommentsController] AddComment error: {ex.Message}");
        return StatusCode(500, "Comment add failed.");
      }
    }

    // PUT api/comments/{id}
    // Updates the text of an existing comment and notifies the relevant trip group
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateComment(string id, [FromBody] CommentItem updatedComment)
    {
      var existingComment = await _commentsService.GetCommentByIdAsync(id);
      if (existingComment == null) return NotFound();

      existingComment.Text = updatedComment.Text;
      existingComment.UpdatedAt = DateTime.UtcNow;

      await _commentsService.UpdateAsync(id, existingComment);

      // Notify only the trip group, or everyone if no trip is linked
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

    // DELETE api/comments/{id}
    // Deletes a comment by ID, removes any attached PDF from storage, and notifies the trip group
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComment(string id)
    {
      var comment = await _commentsService.GetCommentByIdAsync(id);
      if (comment == null) return NotFound();

      // If the comment has a PDF attached, delete it from GridFS file storage
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

      await _commentsService.DeleteCommentAsync(id);

      // Notify only the trip group, or everyone if no trip is linked
      if (!string.IsNullOrEmpty(comment.TripId))
      {
        await _hubContext.Clients.Group(comment.TripId).SendAsync("CommentDeleted", id);
      }
      else
      {
        await _hubContext.Clients.All.SendAsync("CommentDeleted", id);
      }

      return NoContent();
    }
  }
}