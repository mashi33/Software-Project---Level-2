using Microsoft.AspNetCore.SignalR;
using SmartJourneyPlanner.Hubs;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace SmartJourneyPlanner.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiscussionsController : ControllerBase
    {
        private readonly DiscussionsService _discussionsService;
        private readonly CommentsService _commentsService;
        private readonly IHubContext<ChatHub> _hubContext;

        public DiscussionsController(DiscussionsService discussionsService, CommentsService commentsService, IHubContext<ChatHub> hubContext)
        {
            _discussionsService = discussionsService;
            _commentsService = commentsService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<List<DiscussionItem>>> Get()
        {
            try
            {
                var discussions = await _discussionsService.GetAsync();
                return Ok(discussions);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GET Discussions failed: {ex.Message}");
                return StatusCode(500, "Can not fetch data.");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Post(DiscussionItem newDiscussion)
        {
            try
            {
                newDiscussion.CreatedAt = DateTime.UtcNow;
                newDiscussion.IsConfirmed = false;
                newDiscussion.IsRejected = false; // Initialize IsRejected
                newDiscussion.VotedUsers = new List<string>();
                newDiscussion.UserVotes = new List<UserVoteRecord>();

                newDiscussion.Comments = new List<CommentItem>();

                // යහළුවාගේ කොටසින් අගයක් නොලැබුණහොත් Default 5 ක් ලබා දීම
                if (newDiscussion.MemberLimit <= 0)
                {
                    newDiscussion.MemberLimit = 5;
                }

                if (newDiscussion.Type == "Trip")
                {
                    newDiscussion.Options = new List<VoteOption>
                    {
                        new VoteOption { OptionText = "Agree", VoteCount = 0 },
                        new VoteOption { OptionText = "Disagree", VoteCount = 0 }
                    };
                }
                else if (newDiscussion.Options == null)
                {
                    newDiscussion.Options = new List<VoteOption>();
                }

                await _discussionsService.CreateAsync(newDiscussion);
                await _hubContext.Clients.All.SendAsync("NewDiscussion", newDiscussion);

                return CreatedAtAction(nameof(Get), new { id = newDiscussion.Id }, newDiscussion);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] POST Discussion failed: {ex.Message}");
                return StatusCode(500, "Discussion creation unsuccessful.");
            }
        }

        [HttpPost("{id}/vote")]
        public async Task<IActionResult> Vote(string id, [FromBody] VoteRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.OptionText) || string.IsNullOrWhiteSpace(request.UserName))
                {
                    return BadRequest(new { message = "Invalid vote request. User or Option missing." });
                }

                var discussion = await _discussionsService.GetAsync(id);
                if (discussion == null) return NotFound();

                // ඡන්දය දැනටමත් Confirm වී ඇත්නම් නව ඡන්ද ලබා නොගැනීම
                if (discussion.IsConfirmed)
                {
                    return BadRequest(new { message = "Voting is closed for this item." });
                }

                discussion.UserVotes ??= new List<UserVoteRecord>();
                discussion.Options ??= new List<VoteOption>();

                var existingVote = discussion.UserVotes.FirstOrDefault(v =>
                    v.UserId.Trim().Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase));

                if (existingVote != null)
                {
                    if (existingVote.OptionText.Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        return Ok(discussion);
                    }

                    var oldOption = discussion.Options.FirstOrDefault(o => o.OptionText == existingVote.OptionText);
                    if (oldOption != null && oldOption.VoteCount > 0) oldOption.VoteCount--;

                    existingVote.OptionText = request.OptionText.Trim();
                }
                else
                {
                    discussion.UserVotes.Add(new UserVoteRecord
                    {
                        UserId = request.UserName.Trim(),
                        OptionText = request.OptionText.Trim()
                    });

                    discussion.VotedUsers ??= new List<string>();
                    discussion.VotedUsers.Add(request.UserName);
                }

                var option = discussion.Options.FirstOrDefault(o =>
                    o.OptionText.Trim().Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase));

                if (option == null)
                {
                    return BadRequest(new { message = $"Option '{request.OptionText}' not found." });
                }

                option.VoteCount++;

                // 3. Trip එකක් නම් තීරණයක් ගත හැකිදැයි පරීක්ෂා කිරීම (MemberLimit logic)
                if (discussion.Type == "Trip")
                {
                    int currentTotalVotes = discussion.UserVotes.Count;
                    int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 5;

                    var agreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Agree")?.VoteCount ?? 0;
                    double threshold = limit * 0.5;

                    // ඔබ කී පරිදි හැමෝම ඡන්දය දී අවසන් නම් පමණක් තීරණය ගැනීම
                    if (currentTotalVotes >= limit)
                    {
                        if (agreeCount > threshold)
                        {
                            discussion.IsConfirmed = true;
                            discussion.IsRejected = false;
                        }
                        else
                        {
                            discussion.IsConfirmed = false;
                            discussion.IsRejected = true;
                        }
                    }
                    else
                    {
                        // තවමත් ඡන්දය දෙන පිරිස සීමාවට වඩා අඩු නම්
                        discussion.IsConfirmed = false;
                        discussion.IsRejected = false;
                    }
                }

                await _discussionsService.UpdateAsync(id, discussion);
                await _hubContext.Clients.All.SendAsync("UpdateVotes", discussion);

                return Ok(discussion);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Voting failed: {ex.Message}");
                return StatusCode(500, "Vote cast failed.");
            }
        }

        [HttpGet("comments/all")]
        public async Task<ActionResult<List<CommentItem>>> GetAllComments()
        {
            var comments = await _commentsService.GetAsync();
            return Ok(comments);
        }

        [HttpPost("comments")]
        public async Task<IActionResult> AddComment([FromBody] CommentItem comment)
        {
            try
            {
                comment.CreatedAt = DateTime.UtcNow;
                await _commentsService.CreateAsync(comment);
                await _hubContext.Clients.All.SendAsync("ReceiveComment", comment);
                return Ok(comment);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] AddComment failed: {ex.Message}");
                return StatusCode(500, "Comment add failed.");
            }
        }

        [HttpPut("comments/{id}")]
        public async Task<IActionResult> UpdateComment(string id, [FromBody] CommentItem updatedComment)
        {
            try
            {
                var existingComment = await _commentsService.GetCommentByIdAsync(id);
                if (existingComment == null) return NotFound();

                existingComment.Text = updatedComment.Text;
                await _commentsService.UpdateAsync(id, existingComment);
                await _hubContext.Clients.All.SendAsync("CommentUpdated", existingComment);

                return Ok(existingComment);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] UpdateComment failed: {ex.Message}");
                return StatusCode(500, "Update failed.");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var discussion = await _discussionsService.GetAsync(id);
                if (discussion == null) return NotFound();

                await _discussionsService.RemoveAsync(id);
                await _hubContext.Clients.All.SendAsync("DiscussionDeleted", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Delete failed: {ex.Message}");
                return StatusCode(500, "Delete failed.");
            }
        }

        [HttpDelete("comments/{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            var comment = await _commentsService.GetCommentByIdAsync(id);
            if (comment == null) return NotFound();

            await _commentsService.DeleteCommentAsync(id);
            await _hubContext.Clients.All.SendAsync("CommentDeleted", id);

            return NoContent();
        }

        public class VoteRequest
        {
            public string OptionText { get; set; } = string.Empty;
            public string UserName { get; set; } = string.Empty;
        }
    }
}