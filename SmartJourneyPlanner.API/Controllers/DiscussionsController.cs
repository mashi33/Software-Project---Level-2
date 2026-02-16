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
        private readonly IHubContext<ChatHub> _hubContext;
        private const int TotalTeamMembers = 8;

        public DiscussionsController(DiscussionsService discussionsService, IHubContext<ChatHub> hubContext)
        {
            _discussionsService = discussionsService;
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
                return StatusCode(500, "දත්ත ලබා ගැනීමට නොහැකි විය.");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Post(DiscussionItem newDiscussion)
        {
            try
            {
                newDiscussion.CreatedAt = DateTime.UtcNow;
                newDiscussion.IsConfirmed = false;
                newDiscussion.VotedUsers = new List<string>();
                newDiscussion.Comments = new List<CommentItem>();

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
                return StatusCode(500, "සාකච්ඡාව නිර්මාණය කිරීමට නොහැකි විය.");
            }
        }

        // --- යාවත්කාලීන කළ Vote Action එක ---
        [HttpPost("{id}/vote")]
        public async Task<IActionResult> Vote(string id, [FromBody] VoteRequest request)
        {
            try
            {
                // 1. Request එක පරීක්ෂා කිරීම
                if (request == null || string.IsNullOrWhiteSpace(request.OptionText) || string.IsNullOrWhiteSpace(request.UserName))
                {
                    return BadRequest(new { message = "Invalid vote request. User or Option missing." });
                }

                var discussion = await _discussionsService.GetAsync(id);
                if (discussion == null) return NotFound();

                // 2. Null checks
                discussion.VotedUsers ??= new List<string>();
                discussion.Options ??= new List<VoteOption>();

                // 3. දැනටමත් ඡන්දය දී ඇත්නම් (400 Error එකට හේතුව මෙය විය හැක)
                // පරීක්ෂා කිරීම සඳහා මෙය තාවකාලිකව ඉවත් කර බැලිය හැකිය
                if (discussion.VotedUsers.Any(u => u.Trim().Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase)))
                {
                    return BadRequest(new { message = "You have already voted!" });
                }

                // 4. අදාළ Option එක සෙවීම (Case-insensitive)
                var option = discussion.Options.FirstOrDefault(o =>
                    o.OptionText.Trim().Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase));

                if (option == null)
                {
                    return BadRequest(new { message = $"Option '{request.OptionText}' not found." });
                }

                // 5. දත්ත යාවත්කාලීන කිරීම
                option.VoteCount++;
                discussion.VotedUsers.Add(request.UserName);

                // 6. Trip Confirmation Logic
                if (discussion.Type == "Trip")
                {
                    var agreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Agree")?.VoteCount ?? 0;
                    var disagreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Disagree")?.VoteCount ?? 0;

                    discussion.IsConfirmed = agreeCount > (TotalTeamMembers * 0.5);

                    if (disagreeCount >= (TotalTeamMembers * 0.5))
                    {
                        await _discussionsService.RemoveAsync(id);
                        await _hubContext.Clients.All.SendAsync("DiscussionDeleted", id);
                        return Ok(new { status = "deleted", title = discussion.Title });
                    }
                }

                await _discussionsService.UpdateAsync(id, discussion);

                // REAL-TIME: සැමට යාවත්කාලීන දත්ත යැවීම
                await _hubContext.Clients.All.SendAsync("UpdateVotes", discussion);

                return Ok(discussion);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Voting failed: {ex.Message}");
                return StatusCode(500, "ඡන්දය සටහන් කිරීමට නොහැකි විය.");
            }
        }

        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(string id, [FromBody] CommentItem comment)
        {
            try
            {
                var discussion = await _discussionsService.GetAsync(id);
                if (discussion == null) return NotFound();

                comment.CreatedAt = DateTime.UtcNow;
                discussion.Comments ??= new List<CommentItem>();
                discussion.Comments.Add(comment);

                await _discussionsService.UpdateAsync(id, discussion);
                await _hubContext.Clients.All.SendAsync("ReceiveComment", new { discussionId = id, comment = comment });

                return Ok(discussion);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] AddComment failed: {ex.Message}");
                return StatusCode(500, "අදහස එක් කිරීමට නොහැකි විය.");
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
                return StatusCode(500, "මැකීම අසාර්ථකයි.");
            }
        }

        public class VoteRequest
        {
            public string OptionText { get; set; } = string.Empty;
            public string UserName { get; set; } = string.Empty;
        }
    }
}