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
            catch (Exception)
            {
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
                newDiscussion.IsRejected = false;
                newDiscussion.VotedUsers = new List<string>();
                newDiscussion.UserVotes = new List<UserVoteRecord>();
                newDiscussion.Comments = new List<CommentItem>();

                if (newDiscussion.MemberLimit <= 0) newDiscussion.MemberLimit = 5;

                if (newDiscussion.Type == "Trip")
                {
                    newDiscussion.Options = new List<VoteOption> {
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
            catch (Exception)
            {
                return StatusCode(500, "Discussion creation unsuccessful.");
            }
        }

        [HttpPost("{id}/vote")]
        public async Task<IActionResult> Vote(string id, [FromBody] VoteRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.OptionText) || string.IsNullOrWhiteSpace(request.UserName))
                    return BadRequest(new { message = "Invalid vote request." });

                var discussion = await _discussionsService.GetAsync(id);
                if (discussion == null) return NotFound();
                if (discussion.IsConfirmed) return BadRequest(new { message = "Voting is closed." });

                discussion.UserVotes ??= new List<UserVoteRecord>();
                discussion.Options ??= new List<VoteOption>();

                var existingVote = discussion.UserVotes.FirstOrDefault(v => v.UserId.Trim().Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase));

                if (existingVote != null)
                {
                    if (existingVote.OptionText.Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase)) return Ok(discussion);
                    var oldOption = discussion.Options.FirstOrDefault(o => o.OptionText == existingVote.OptionText);
                    if (oldOption != null && oldOption.VoteCount > 0) oldOption.VoteCount--;
                    existingVote.OptionText = request.OptionText.Trim();
                }
                else
                {
                    discussion.UserVotes.Add(new UserVoteRecord { UserId = request.UserName.Trim(), OptionText = request.OptionText.Trim() });
                    discussion.VotedUsers ??= new List<string>();
                    discussion.VotedUsers.Add(request.UserName);
                }

                var option = discussion.Options.FirstOrDefault(o => o.OptionText.Trim().Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase));
                if (option == null) return BadRequest(new { message = "Option not found." });
                option.VoteCount++;

                // Majority Logic
                if (discussion.Type == "Trip")
                {
                    int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 5;
                    var agreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Agree")?.VoteCount ?? 0;
                    if (discussion.UserVotes.Count >= limit)
                    {
                        discussion.IsConfirmed = agreeCount > (limit * 0.5);
                        discussion.IsRejected = !discussion.IsConfirmed;
                    }
                }

                await _discussionsService.UpdateAsync(id, discussion);
                await _hubContext.Clients.All.SendAsync("UpdateVotes", discussion);
                return Ok(discussion);
            }
            catch (Exception)
            {
                return StatusCode(500, "Vote failed.");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _discussionsService.RemoveAsync(id);
            await _hubContext.Clients.All.SendAsync("DiscussionDeleted", id);
            return NoContent();
        }

        public class VoteRequest
        {
            public string OptionText { get; set; } = string.Empty;
            public string UserName { get; set; } = string.Empty;
        }
    }
}