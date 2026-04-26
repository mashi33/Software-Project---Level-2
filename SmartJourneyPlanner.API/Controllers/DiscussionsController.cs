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
  // Handles all API requests related to discussions and voting within trips
  [Route("api/[controller]")]
  [ApiController]
  public class DiscussionsController : ControllerBase
  {
    private readonly DiscussionsService _discussionsService;  // Manages discussion data in the database
    private readonly IHubContext<ChatHub> _hubContext;        // Sends real-time updates to connected clients

    // Injects the required services via dependency injection
    public DiscussionsController(DiscussionsService discussionsService, IHubContext<ChatHub> hubContext)
    {
      _discussionsService = discussionsService;
      _hubContext = hubContext;
    }

    // GET api/discussions
    // Returns all discussions stored in the database
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

    // GET api/discussions/trip/{tripId}
    // Returns only the discussions that belong to a specific trip
    [HttpGet("trip/{tripId}")]
    public async Task<ActionResult<List<DiscussionItem>>> GetByTrip(string tripId)
    {
      try
      {
        var discussions = await _discussionsService.GetByTripAsync(tripId);
        return Ok(discussions);
      }
      catch (Exception)
      {
        return StatusCode(500, "Can not fetch data for this trip.");
      }
    }

    // POST api/discussions
    // Creates a new discussion, sets default values, and notifies the relevant trip group in real time
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

        // Default member limit to 1 if not set
        if (newDiscussion.MemberLimit <= 0)
          newDiscussion.MemberLimit = 1;

        // Trip-type discussions always have Agree/Disagree options
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

        // Notify only the trip group, or everyone if no trip is linked
        if (!string.IsNullOrEmpty(newDiscussion.TripId))
        {
          await _hubContext.Clients.Group(newDiscussion.TripId).SendAsync("NewDiscussion", newDiscussion);
        }
        else
        {
          await _hubContext.Clients.All.SendAsync("NewDiscussion", newDiscussion);
        }

        return CreatedAtAction(nameof(Get), new { id = newDiscussion.Id }, newDiscussion);
      }
      catch (Exception)
      {
        return StatusCode(500, "Discussion creation unsuccessful.");
      }
    }

    // POST api/discussions/{id}/vote
    // Records a user's vote on a discussion option and updates the discussion outcome
    [HttpPost("{id}/vote")]
    public async Task<IActionResult> Vote(string id, [FromBody] VoteRequest request)
    {
      try
      {
        // Reject the request if any required field is missing
        if (request == null || string.IsNullOrWhiteSpace(request.OptionText) || string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(id))
          return BadRequest(new { message = "Invalid vote request." });

        var discussion = await _discussionsService.GetAsync(id);
        if (discussion == null) return NotFound();

        // ── FIXED: only block if CONFIRMED or REJECTED (not on a tie).
        // A tie leaves both false, so voting remains open.
        if (discussion.IsConfirmed || discussion.IsRejected)
          return BadRequest(new { message = "Voting is closed and finalized." });

        discussion.UserVotes ??= new List<UserVoteRecord>();
        discussion.Options ??= new List<VoteOption>();

        // Check if this user has already voted
        var existingVote = discussion.UserVotes.FirstOrDefault(v =>
            v.UserId.Trim().Equals(request.UserName.Trim(), StringComparison.OrdinalIgnoreCase));

        if (existingVote != null)
        {
          // Same option clicked again — no change needed
          if (existingVote.OptionText.Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase))
            return Ok(discussion);

          // Remove old vote count
          var oldOption = discussion.Options.FirstOrDefault(o => o.OptionText == existingVote.OptionText);
          if (oldOption != null && oldOption.VoteCount > 0)
            oldOption.VoteCount--;

          // Update existing vote record
          existingVote.OptionText = request.OptionText.Trim();
        }
        else
        {
          // ── FIXED: only allow a NEW voter if member limit is not reached.
          // Existing voters (existingVote != null path above) can always change their vote.
          int limitCheck = discussion.MemberLimit > 0 ? discussion.MemberLimit : 1;
          if (discussion.UserVotes.Count >= limitCheck)
            return BadRequest(new { message = "Member limit reached. Only existing voters can change their vote." });

          discussion.UserVotes.Add(new UserVoteRecord { UserId = request.UserName.Trim(), OptionText = request.OptionText.Trim() });
          discussion.VotedUsers ??= new List<string>();
          discussion.VotedUsers.Add(request.UserName);
        }

        // Increment the vote count for the selected option
        var option = discussion.Options.FirstOrDefault(o =>
            o.OptionText.Trim().Equals(request.OptionText.Trim(), StringComparison.OrdinalIgnoreCase));

        if (option == null) return BadRequest(new { message = "Option not found." });
        option.VoteCount++;

        // ── UPDATED Majority Logic ──
        // Determine the discussion outcome once all members have voted
        if (discussion.Type == "Trip")
        {
          int limit = discussion.MemberLimit > 0 ? discussion.MemberLimit : 1;

          var agreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Agree")?.VoteCount ?? 0;
          var disagreeCount = discussion.Options.FirstOrDefault(o => o.OptionText == "Disagree")?.VoteCount ?? 0;

          if (discussion.UserVotes.Count >= limit)
          {
            if (agreeCount > disagreeCount)
            {
              // Majority agree → Confirmed, lock votes
              discussion.IsConfirmed = true;
              discussion.IsRejected = false;
            }
            else if (disagreeCount > agreeCount)
            {
              // Majority disagree → Rejected, lock votes
              discussion.IsConfirmed = false;
              discussion.IsRejected = true;
            }
            else
            {
              // Tie → stay Pending, votes remain editable
              discussion.IsConfirmed = false;
              discussion.IsRejected = false;
            }
          }
          else
          {
            // Not all members voted yet → always Pending
            discussion.IsConfirmed = false;
            discussion.IsRejected = false;
          }
        }

        await _discussionsService.UpdateAsync(id, discussion);

        // Notify only the trip group, or everyone if no trip is linked
        if (!string.IsNullOrEmpty(discussion.TripId))
        {
          await _hubContext.Clients.Group(discussion.TripId).SendAsync("UpdateVotes", discussion);
        }
        else
        {
          await _hubContext.Clients.All.SendAsync("UpdateVotes", discussion);
        }

        return Ok(discussion);
      }
      catch (Exception)
      {
        return StatusCode(500, "Vote failed.");
      }
    }

    // DELETE api/discussions/{id}
    // Deletes a discussion by ID and notifies the relevant trip group
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
      var discussion = await _discussionsService.GetAsync(id);
      await _discussionsService.RemoveAsync(id);

      // Notify only the trip group, or everyone if no trip is linked
      if (discussion != null && !string.IsNullOrEmpty(discussion.TripId))
      {
        await _hubContext.Clients.Group(discussion.TripId).SendAsync("DiscussionDeleted", id);
      }
      else
      {
        await _hubContext.Clients.All.SendAsync("DiscussionDeleted", id);
      }

      return NoContent();
    }

    // Represents the data sent by the client when casting a vote
    public class VoteRequest
    {
      public string OptionText { get; set; } = string.Empty;  // The option the user voted for
      public string UserName { get; set; } = string.Empty;    // The user who is voting
    }
  }
}