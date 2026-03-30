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
        private readonly IHubContext<ChatHub> _hubContext;

        public CommentsController(CommentsService commentsService, IHubContext<ChatHub> hubContext)
        {
            _commentsService = commentsService;
            _hubContext = hubContext;
        }

        [HttpGet("all")]
        public async Task<ActionResult<List<CommentItem>>> GetAllComments()
        {
            var comments = await _commentsService.GetAsync();
            return Ok(comments);
        }

        [HttpPost]
        public async Task<IActionResult> AddComment([FromBody] CommentItem comment)
        {
            try
            {
                comment.CreatedAt = DateTime.UtcNow;
                await _commentsService.CreateAsync(comment);
                await _hubContext.Clients.All.SendAsync("ReceiveComment", comment);
                return Ok(comment);
            }
            catch (Exception)
            {
                return StatusCode(500, "Comment add failed.");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(string id, [FromBody] CommentItem updatedComment)
        {
            var existingComment = await _commentsService.GetCommentByIdAsync(id);
            if (existingComment == null) return NotFound();

            existingComment.Text = updatedComment.Text;
            await _commentsService.UpdateAsync(id, existingComment);
            await _hubContext.Clients.All.SendAsync("CommentUpdated", existingComment);
            return Ok(existingComment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            var comment = await _commentsService.GetCommentByIdAsync(id);
            if (comment == null) return NotFound();

            await _commentsService.DeleteCommentAsync(id);
            await _hubContext.Clients.All.SendAsync("CommentDeleted", id);
            return NoContent();
        }
    }
}
