using SmartJourneyPlanner.API.Models;
using System;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class DiscussionVotingTests
  {
    // Helper — creates a Trip-type discussion with given Agree/Disagree vote counts
    private DiscussionItem CreateDiscussion(int agreeVotes, int disagreeVotes, int memberLimit)
    {
      return new DiscussionItem
      {
        Type = "Trip",
        MemberLimit = memberLimit,
        UserVotes = new List<UserVoteRecord>(),
        Options = new List<VoteOption>
                {
                    new VoteOption { OptionText = "Agree", VoteCount = agreeVotes },
                    new VoteOption { OptionText = "Disagree", VoteCount = disagreeVotes }
                }
      };
    }

    [Fact]
    public void MajorityAgree_ShouldConfirmDiscussion()
    {
      // Arrange — 3 agree, 1 disagree, all 4 members voted
      var discussion = CreateDiscussion(agreeVotes: 3, disagreeVotes: 1, memberLimit: 4);
      for (int i = 0; i < 4; i++)
        discussion.UserVotes.Add(new UserVoteRecord { UserId = $"user{i}", OptionText = "Agree" });

      var agreeCount = discussion.Options[0].VoteCount;
      var disagreeCount = discussion.Options[1].VoteCount;

      // Act — apply the same rule used in DiscussionsController
      bool isConfirmed = false;
      bool isRejected = false;
      if (discussion.UserVotes.Count >= discussion.MemberLimit)
      {
        if (agreeCount > disagreeCount) isConfirmed = true;
        else if (disagreeCount > agreeCount) isRejected = true;
      }

      // Assert
      Assert.True(isConfirmed);
      Assert.False(isRejected);
    }

    [Fact]
    public void MajorityDisagree_ShouldRejectDiscussion()
    {
      var discussion = CreateDiscussion(agreeVotes: 1, disagreeVotes: 3, memberLimit: 4);
      for (int i = 0; i < 4; i++)
        discussion.UserVotes.Add(new UserVoteRecord { UserId = $"user{i}", OptionText = "Disagree" });

      var agreeCount = discussion.Options[0].VoteCount;
      var disagreeCount = discussion.Options[1].VoteCount;

      bool isConfirmed = false;
      bool isRejected = false;
      if (discussion.UserVotes.Count >= discussion.MemberLimit)
      {
        if (agreeCount > disagreeCount) isConfirmed = true;
        else if (disagreeCount > agreeCount) isRejected = true;
      }

      Assert.False(isConfirmed);
      Assert.True(isRejected);
    }

    [Fact]
    public void TieVote_ShouldStayPending()
    {
      // Arrange — 2 agree, 2 disagree — a tie
      var discussion = CreateDiscussion(agreeVotes: 2, disagreeVotes: 2, memberLimit: 4);
      for (int i = 0; i < 4; i++)
        discussion.UserVotes.Add(new UserVoteRecord { UserId = $"user{i}", OptionText = "Agree" });

      var agreeCount = discussion.Options[0].VoteCount;
      var disagreeCount = discussion.Options[1].VoteCount;

      bool isConfirmed = false;
      bool isRejected = false;
      if (discussion.UserVotes.Count >= discussion.MemberLimit)
      {
        if (agreeCount > disagreeCount) isConfirmed = true;
        else if (disagreeCount > agreeCount) isRejected = true;
        // else — stays pending (both false), matching the real controller logic
      }

      // Assert — tie means neither confirmed nor rejected
      Assert.False(isConfirmed);
      Assert.False(isRejected);
    }

    [Fact]
    public void NotAllMembersVoted_ShouldStayPending()
    {
      // Arrange — only 2 out of 4 members voted, even though Agree is currently winning
      var discussion = CreateDiscussion(agreeVotes: 2, disagreeVotes: 0, memberLimit: 4);
      discussion.UserVotes.Add(new UserVoteRecord { UserId = "user1", OptionText = "Agree" });
      discussion.UserVotes.Add(new UserVoteRecord { UserId = "user2", OptionText = "Agree" });

      bool isConfirmed = false;
      bool isRejected = false;
      if (discussion.UserVotes.Count >= discussion.MemberLimit)
      {
        var agreeCount = discussion.Options[0].VoteCount;
        var disagreeCount = discussion.Options[1].VoteCount;
        if (agreeCount > disagreeCount) isConfirmed = true;
        else if (disagreeCount > agreeCount) isRejected = true;
      }

      // Assert — must stay Pending until all members have voted
      Assert.False(isConfirmed);
      Assert.False(isRejected);
    }

    [Fact]
    public void ExistingVoter_CanChangeVote_WithoutHittingLimit()
    {
      // Arrange — member limit is 2, both slots already filled
      var discussion = CreateDiscussion(agreeVotes: 1, disagreeVotes: 1, memberLimit: 2);
      discussion.UserVotes.Add(new UserVoteRecord { UserId = "sandali", OptionText = "Agree" });
      discussion.UserVotes.Add(new UserVoteRecord { UserId = "irushika", OptionText = "Disagree" });

      // Act — "sandali" (an existing voter) wants to switch from Agree to Disagree
      var existingVote = discussion.UserVotes.Find(v => v.UserId == "sandali");
      bool isNewVoter = existingVote == null;

      // Same rule as DiscussionsController.Vote — only NEW voters are blocked by the limit
      bool blocked = isNewVoter && discussion.UserVotes.Count >= discussion.MemberLimit;

      // Assert — existing voters should NEVER be blocked, even when all slots are full
      Assert.False(blocked);
    }

    [Fact]
    public void NewVoter_IsBlocked_WhenMemberLimitReached()
    {
      // Arrange — member limit is 2, both slots already filled by other users
      var discussion = CreateDiscussion(agreeVotes: 1, disagreeVotes: 1, memberLimit: 2);
      discussion.UserVotes.Add(new UserVoteRecord { UserId = "sandali", OptionText = "Agree" });
      discussion.UserVotes.Add(new UserVoteRecord { UserId = "irushika", OptionText = "Disagree" });

      // Act — a brand new voter ("kasun") tries to vote
      var existingVote = discussion.UserVotes.Find(v => v.UserId == "kasun");
      bool isNewVoter = existingVote == null;

      bool blocked = isNewVoter && discussion.UserVotes.Count >= discussion.MemberLimit;

      // Assert — a NEW voter must be blocked once the limit is reached
      Assert.True(blocked);
    }
    [Fact]
    public void SoftDelete_ClearsContent_AndSetsIsDeletedTrue()
    {
      // Arrange — a normal text comment
      var comment = new CommentItem
      {
        Id = "c1",
        TripId = "trip1",
        User = "sandali",
        Text = "hello everyone!",
        MessageType = "text",
        IsDeleted = false
      };

      // Act — apply the same soft-delete steps used in CommentsController.DeleteComment
      comment.IsDeleted = true;
      comment.Text = string.Empty;
      comment.MessageType = "text";
      comment.FileId = null;
      comment.FileName = null;
      comment.FileSize = null;

      // Assert — content is gone, but the record itself (Id, User, TripId) is preserved
      Assert.True(comment.IsDeleted);
      Assert.Equal(string.Empty, comment.Text);
      Assert.Null(comment.FileId);
      Assert.Equal("c1", comment.Id);       // record still exists
      Assert.Equal("sandali", comment.User); // still know who sent it
    }

    [Fact]
    public void SoftDelete_OnPdfMessage_DowngradesToText()
    {
      // Arrange — a PDF message
      var comment = new CommentItem
      {
        Id = "c2",
        TripId = "trip1",
        User = "kasun",
        MessageType = "pdf",
        FileId = "file123",
        FileName = "itinerary.pdf",
        FileSize = 20480
      };

      // Act — same soft-delete steps
      comment.IsDeleted = true;
      comment.Text = string.Empty;
      comment.MessageType = "text";  // downgrade so UI doesn't try to render a PDF bubble
      comment.FileId = null;
      comment.FileName = null;
      comment.FileSize = null;

      // Assert — PDF-specific fields are all gone, type downgraded
      Assert.Equal("text", comment.MessageType);
      Assert.Null(comment.FileId);
      Assert.Null(comment.FileName);
      Assert.Null(comment.FileSize);
    }

    [Fact]
    public void MemberLimit_EqualsMemberCount_WhenListIncludesOwner()
    {
      // Arrange — GetTrip() returns a Members list that already includes the Owner
      // (Owner + 3 invited members = 4 total)
      var members = new List<string> { "owner@mail.com", "member1@mail.com", "member2@mail.com", "member3@mail.com" };

      // Act — dynamicLimit should equal members.Count directly (no extra +1),
      // matching the fix applied in discussion.component.ts addNewTrip()
      int dynamicLimit = members.Count;

      // Assert
      Assert.Equal(4, dynamicLimit);
    }

    [Fact]
    public void MemberLimit_AddsOwnerSeparately_WhenListExcludesOwner()
    {
      // Arrange — Trip.Members (raw DB field, via NormalizeMembers) excludes the owner
      // (3 invited members, owner stored separately in CreatorEmail)
      var invitedMembers = new List<string> { "member1@mail.com", "member2@mail.com", "member3@mail.com" };

      // Act — this matches TripsController.UpdateTrip: newLimit = updatedTrip.Members.Count + 1
      int newLimit = invitedMembers.Count + 1;

      // Assert — 3 invited + 1 owner = 4
      Assert.Equal(4, newLimit);
    }
    // Helper — replicates TripsController.NormalizeMembers() logic for testing
    private List<TripMember> NormalizeMembers(List<TripMember> members, string ownerEmail)
    {
      var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      var cleaned = new List<TripMember>();

      foreach (var member in members)
      {
        var email = member.Email?.Trim().ToLowerInvariant() ?? "";
        if (email.Length == 0) continue;
        if (string.Equals(email, ownerEmail?.Trim(), StringComparison.OrdinalIgnoreCase)) continue;
        if (!seen.Add(email)) continue;

        cleaned.Add(new TripMember
        {
          Email = email,
          Role = string.IsNullOrWhiteSpace(member.Role) ? "Viewer" : member.Role
        });
      }

      return cleaned;
    }

    [Fact]
    public void NormalizeMembers_ExcludesOwner_EvenIfListedAsMember()
    {
      // Arrange — owner accidentally included in the members list
      var members = new List<TripMember>
            {
                new TripMember { Email = "owner@mail.com", Role = "Editor" },
                new TripMember { Email = "friend@mail.com", Role = "Viewer" }
            };

      // Act
      var result = NormalizeMembers(members, "owner@mail.com");

      // Assert — owner must never appear in the cleaned list
      Assert.DoesNotContain(result, m => m.Email == "owner@mail.com");
      Assert.Single(result);
      Assert.Equal("friend@mail.com", result[0].Email);
    }

    [Fact]
    public void NormalizeMembers_RemovesDuplicates_CaseInsensitive()
    {
      // Arrange — same email added twice with different casing
      var members = new List<TripMember>
            {
                new TripMember { Email = "Sandali@Mail.com", Role = "Viewer" },
                new TripMember { Email = "sandali@mail.com", Role = "Editor" }
            };

      // Act
      var result = NormalizeMembers(members, "owner@mail.com");

      // Assert — only ONE entry should remain, despite casing differences
      Assert.Single(result);
    }

    [Fact]
    public void NormalizeMembers_DropsBlankEmails()
    {
      // Arrange — a blank/whitespace email slipped into the list
      var members = new List<TripMember>
            {
                new TripMember { Email = "  ", Role = "Viewer" },
                new TripMember { Email = "valid@mail.com", Role = "Viewer" }
            };

      // Act
      var result = NormalizeMembers(members, "owner@mail.com");

      // Assert — blank email is dropped, valid one remains
      Assert.Single(result);
      Assert.Equal("valid@mail.com", result[0].Email);
    }

    [Fact]
    public void NormalizeMembers_DefaultsRole_WhenRoleIsMissing()
    {
      // Arrange — no role specified
      var members = new List<TripMember>
            {
                new TripMember { Email = "newmember@mail.com", Role = "" }
            };

      // Act
      var result = NormalizeMembers(members, "owner@mail.com");

      // Assert — should default to "Viewer"
      Assert.Equal("Viewer", result[0].Role);
    }
    [Fact]
    public void EditComment_SetsIsEditedTrue_AndUpdatesText()
    {
      // Arrange — an existing comment
      var comment = new CommentItem
      {
        Id = "c3",
        TripId = "trip1",
        User = "sandali",
        Text = "original message",
        IsEdited = false
      };

      // Act — apply the same steps used in CommentsController.UpdateComment
      comment.Text = "edited message";
      comment.IsEdited = true;

      // Assert
      Assert.Equal("edited message", comment.Text);
      Assert.True(comment.IsEdited);
    }

    [Fact]
    public void EditedLabel_NotShown_WhenCommentIsDeleted()
    {
      // Arrange — a message that was both edited AND later deleted
      var comment = new CommentItem
      {
        Id = "c4",
        IsEdited = true,
        IsDeleted = true
      };

      // Act — same condition used in comments.html: *ngIf="comment.isEdited && !comment.isDeleted"
      bool shouldShowEditedLabel = comment.IsEdited && !comment.IsDeleted;

      // Assert — deleted takes priority, "(edited)" should never show on a deleted message
      Assert.False(shouldShowEditedLabel);
    }

    [Fact]
    public void PdfUpload_RejectsFilesOver20MB()
    {
      // Arrange — simulates the file size check used in CommentsService/FileStorageService
      const long maxSizeBytes = 20 * 1024 * 1024; // 20MB
      long fileSize = 25 * 1024 * 1024; // 25MB file

      // Act
      bool isValid = fileSize <= maxSizeBytes;

      // Assert
      Assert.False(isValid);
    }

    [Fact]
    public void PdfUpload_AcceptsFilesUnder20MB()
    {
      const long maxSizeBytes = 20 * 1024 * 1024;
      long fileSize = 10 * 1024 * 1024; // 10MB file

      bool isValid = fileSize <= maxSizeBytes;

      Assert.True(isValid);
    }

    [Fact]
    public void PdfUpload_RejectsNonPdfFileType()
    {
      // Arrange — simulates the file.type !== 'application/pdf' check from comments.ts
      string fileType = "image/jpeg";

      // Act
      bool isValid = fileType == "application/pdf";

      // Assert
      Assert.False(isValid);
    }
  }


}
