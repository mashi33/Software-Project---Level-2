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
    [Route("api/[controller]")]
    [ApiController]
    public class CommentsController : ControllerBase
    {
        private readonly CommentsService _commentsService;
        private readonly FileStorageService _fileStorage;
        private readonly IHubContext<ChatHub> _hubContext;

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
        [HttpGet("all")]
        public async Task<ActionResult<List<CommentItem>>> GetAllComments()
        {
            var comments = await _commentsService.GetAsync();
            return Ok(comments);
        }

        // POST api/comments
        [HttpPost]
        public async Task<IActionResult> AddComment([FromBody] CommentItem comment)
        {
            try
            {
                comment.CreatedAt = DateTime.UtcNow;
                await _commentsService.CreateAsync(comment);

                // Broadcasts to ALL connected clients including the sender.
                // Frontend must NOT invoke SignalR manually after posting —
                // doing so would cause the sender to receive the message twice.
                await _hubContext.Clients.All.SendAsync("ReceiveComment", comment);

                return Ok(comment);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CommentsController] AddComment error: {ex.Message}");
                return StatusCode(500, "Comment add failed.");
            }
        }

        // PUT api/comments/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(string id, [FromBody] CommentItem updatedComment)
        {
            var existingComment = await _commentsService.GetCommentByIdAsync(id);
            if (existingComment == null) return NotFound();

            existingComment.Text = updatedComment.Text;
            existingComment.UpdatedAt = DateTime.UtcNow;

            await _commentsService.UpdateAsync(id, existingComment);
            await _hubContext.Clients.All.SendAsync("CommentUpdated", existingComment);
            return Ok(existingComment);
        }

        // DELETE api/comments/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            var comment = await _commentsService.GetCommentByIdAsync(id);
            if (comment == null) return NotFound();

            // If this message carried a PDF, remove it from GridFS as well
            if (comment.MessageType == "pdf" && !string.IsNullOrEmpty(comment.FileId))
            {
                try
                {
                    await _fileStorage.DeleteAsync(comment.FileId);
                }
                catch (Exception ex)
                {
                    // Non-fatal: log and continue so the message record is still deleted
                    Console.WriteLine($"[CommentsController] GridFS delete warning: {ex.Message}");
                }
            }

            await _commentsService.DeleteCommentAsync(id);
            await _hubContext.Clients.All.SendAsync("CommentDeleted", id);
            return NoContent();
        }
    }
}