using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using Moq;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.Controllers;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Collections.Generic;
using Xunit;
using static SmartJourneyPlanner.Controllers.DiscussionsController;

namespace SmartJourneyPlanner.Tests
{
  public class DiscussionsControllerTests
  {
    // ── Helpers ─────────────────────────────────────────────

    private static Mock<DiscussionsService> CreateMockDiscussionsService()
    {
      // DiscussionsService's real constructor needs IOptions<DatabaseSettings>,
      // but since methods are virtual and CallBase=false, the real Mongo code never runs.
      var options = Microsoft.Extensions.Options.Options.Create(new DatabaseSettings
      {
        ConnectionString = "mongodb://localhost:27017",
        DatabaseName = "TestDb",
        CollectionName = "Discussions"
      });
      return new Mock<DiscussionsService>(options) { CallBase = false };
    }

    private static (DiscussionsController controller, Mock<IHubContext<ChatHub>> hubMock, Mock<DiscussionsService> serviceMock)
        CreateController()
    {
      var serviceMock = CreateMockDiscussionsService();

      var hubMock = new Mock<IHubContext<ChatHub>>();
      var clientsMock = new Mock<IHubClients>();
      var clientProxyMock = new Mock<IClientProxy>();
      clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(clientProxyMock.Object);
      clientsMock.Setup(c => c.All).Returns(clientProxyMock.Object);
      hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);

      var dbMock = new Mock<IMongoDatabase>();
      var tripsCollectionMock = new Mock<IMongoCollection<Trip>>();
      dbMock.Setup(d => d.GetCollection<Trip>("Trips", null)).Returns(tripsCollectionMock.Object);

      var controller = new DiscussionsController(serviceMock.Object, hubMock.Object, dbMock.Object);
      return (controller, hubMock, serviceMock);
    }

    // ── Vote — Majority Agree confirms the discussion ─────────

    [Fact]
    public async Task Vote_MajorityAgree_ReturnsConfirmedDiscussion()
    {
      var (controller, _, serviceMock) = CreateController();

      var discussion = new DiscussionItem
      {
        Id = "d1",
        Type = "Trip",
        MemberLimit = 2,
        TripId = "", // no trip → skips membership check
        UserVotes = new List<UserVoteRecord>
        {
          new UserVoteRecord { UserId = "kasun", OptionText = "Agree" }
        },
        Options = new List<VoteOption>
        {
          new VoteOption { OptionText = "Agree", VoteCount = 1 },
          new VoteOption { OptionText = "Disagree", VoteCount = 0 }
        }
      };

      serviceMock.Setup(s => s.GetAsync("d1")).ReturnsAsync(discussion);
      serviceMock.Setup(s => s.UpdateAsync("d1", It.IsAny<DiscussionItem>())).Returns(Task.CompletedTask);

      var request = new VoteRequest { OptionText = "Agree", UserName = "sandali" };

      var result = await controller.Vote("d1", request);

      var okResult = Assert.IsType<OkObjectResult>(result);
      var updated = Assert.IsType<DiscussionItem>(okResult.Value);
      Assert.True(updated.IsConfirmed);
      Assert.False(updated.IsRejected);
    }

    // ── Vote — discussion not found ────────────────────────────

    [Fact]
    public async Task Vote_DiscussionNotFound_ReturnsNotFound()
    {
      var (controller, _, serviceMock) = CreateController();
      serviceMock.Setup(s => s.GetAsync("missing")).ReturnsAsync((DiscussionItem?)null);

      var request = new VoteRequest { OptionText = "Agree", UserName = "sandali" };
      var result = await controller.Vote("missing", request);

      Assert.IsType<NotFoundResult>(result);
    }

    // ── Vote — invalid request returns BadRequest ──────────────

    [Fact]
    public async Task Vote_MissingOptionText_ReturnsBadRequest()
    {
      var (controller, _, _) = CreateController();
      var request = new VoteRequest { OptionText = "", UserName = "sandali" };

      var result = await controller.Vote("d1", request);

      Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── Vote — already confirmed discussion rejects new votes ──

    [Fact]
    public async Task Vote_OnAlreadyConfirmedDiscussion_ReturnsBadRequest()
    {
      var (controller, _, serviceMock) = CreateController();

      var discussion = new DiscussionItem
      {
        Id = "d2",
        Type = "Trip",
        IsConfirmed = true,
        TripId = "",
        Options = new List<VoteOption> { new VoteOption { OptionText = "Agree" } }
      };
      serviceMock.Setup(s => s.GetAsync("d2")).ReturnsAsync(discussion);

      var request = new VoteRequest { OptionText = "Agree", UserName = "sandali" };
      var result = await controller.Vote("d2", request);

      var badRequest = Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── Delete — removes and returns NoContent ─────────────────

    [Fact]
    public async Task Delete_ExistingDiscussion_ReturnsNoContent()
    {
      var (controller, _, serviceMock) = CreateController();

      var discussion = new DiscussionItem { Id = "d3", TripId = "" };
      serviceMock.Setup(s => s.GetAsync("d3")).ReturnsAsync(discussion);
      serviceMock.Setup(s => s.RemoveAsync("d3")).Returns(Task.CompletedTask);

      var result = await controller.Delete("d3");

      Assert.IsType<NoContentResult>(result);
      serviceMock.Verify(s => s.RemoveAsync("d3"), Times.Once);
    }
    // ── Post — creates a new Trip-type discussion with Agree/Disagree options ──

    [Fact]
    public async Task Post_TripTypeDiscussion_CreatesWithAgreeDisagreeOptions()
    {
      var (controller, hubMock, serviceMock) = CreateController();

      serviceMock
          .Setup(s => s.CreateAsync(It.IsAny<DiscussionItem>()))
          .Returns(Task.CompletedTask);

      var newDiscussion = new DiscussionItem
      {
        Title = "Kandy Trip",
        Type = "Trip",
        TripId = "trip1",
        User = "sandali",
        MemberLimit = 4
      };

      var result = await controller.Post(newDiscussion);

      // Assert — real controller logic actually ran and populated defaults correctly
      var createdResult = Assert.IsType<CreatedAtActionResult>(result);
      var created = Assert.IsType<DiscussionItem>(createdResult.Value);

      Assert.False(created.IsConfirmed);
      Assert.False(created.IsRejected);
      Assert.Equal(2, created.Options.Count);
      Assert.Equal("Agree", created.Options[0].OptionText);
      Assert.Equal("Disagree", created.Options[1].OptionText);

      // Verify the real service method was actually called (not skipped)
      serviceMock.Verify(s => s.CreateAsync(It.IsAny<DiscussionItem>()), Times.Once);
    }

    [Fact]
    public async Task Post_ZeroMemberLimit_DefaultsToOne()
    {
      var (controller, _, serviceMock) = CreateController();
      serviceMock.Setup(s => s.CreateAsync(It.IsAny<DiscussionItem>())).Returns(Task.CompletedTask);

      var newDiscussion = new DiscussionItem
      {
        Title = "Ella Trip",
        Type = "Trip",
        TripId = "trip1",
        User = "kasun",
        MemberLimit = 0   // not set by client
      };

      var result = await controller.Post(newDiscussion);

      var createdResult = Assert.IsType<CreatedAtActionResult>(result);
      var created = Assert.IsType<DiscussionItem>(createdResult.Value);

      // Assert — real controller logic defaults MemberLimit to 1 when <= 0
      Assert.Equal(1, created.MemberLimit);
    }
  }
}
