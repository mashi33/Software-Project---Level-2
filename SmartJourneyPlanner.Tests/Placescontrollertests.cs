using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using MongoDB.Driver;
using SmartJourneyPlanner.Controllers;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class PlacesControllerTests
  {
    // ── Helpers ─────────────────────────────────────────────

    // PlacesService's real constructor needs an HttpClient + IConfiguration,
    // but since we only override virtual members via Moq, these can be dummies —
    // the real HTTP/config code never actually runs in these tests.
    private static Mock<PlacesService> CreateMockPlacesService(string apiKey = "test-key")
    {
      var config = new ConfigurationBuilder()
          .AddInMemoryCollection(new Dictionary<string, string?> { { "GoogleApi:ApiKey", apiKey } })
          .Build();

      var mock = new Mock<PlacesService>(new HttpClient(), config) { CallBase = false };
      mock.Setup(s => s.ApiKey).Returns(apiKey);
      return mock;
    }

    // The controller only needs db.GetCollection<Place>("Places") to not throw
    // when constructed — for the validation/geocode-failure branches tested here,
    // the collection is never actually queried.
    private static IMongoDatabase CreateDummyDatabase()
    {
      var dbMock = new Mock<IMongoDatabase>();
      var collectionMock = new Mock<IMongoCollection<Place>>();
      dbMock.Setup(d => d.GetCollection<Place>("Places", null)).Returns(collectionMock.Object);
      return dbMock.Object;
    }

    private static PlacesController CreateController(Mock<PlacesService> serviceMock)
    {
      return new PlacesController(serviceMock.Object, CreateDummyDatabase());
    }

    // ── API key missing ─────────────────────────────────────

    [Fact]
    public async Task GetNearbyPlaces_MissingApiKey_Returns503()
    {
      var serviceMock = CreateMockPlacesService(apiKey: "");
      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces("Colombo", "Hotel");

      var objectResult = Assert.IsType<ObjectResult>(result);
      Assert.Equal(503, objectResult.StatusCode);
    }

    // ── City validation ──────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task GetNearbyPlaces_EmptyCity_ReturnsBadRequest(string? city)
    {
      var serviceMock = CreateMockPlacesService();
      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces(city!, "Hotel");

      Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── Category validation ──────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task GetNearbyPlaces_EmptyCategory_ReturnsBadRequest(string? category)
    {
      var serviceMock = CreateMockPlacesService();
      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces("Colombo", category!);

      Assert.IsType<BadRequestObjectResult>(result);
    }

    // ── Geocode failures ──────────────────────────────────────

    [Fact]
    public async Task GetNearbyPlaces_CityNotFound_Returns404()
    {
      var serviceMock = CreateMockPlacesService();
      serviceMock.Setup(s => s.GeocodeCity("NotARealCityXyz")).ReturnsAsync(((double, double)?)null);
      serviceMock.Setup(s => s.LastGeocodeNetworkError).Returns(false);

      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces("NotARealCityXyz", "Hotel");

      var notFound = Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetNearbyPlaces_GeocodeNetworkError_Returns503()
    {
      var serviceMock = CreateMockPlacesService();
      serviceMock.Setup(s => s.GeocodeCity("Colombo")).ReturnsAsync(((double, double)?)null);
      serviceMock.Setup(s => s.LastGeocodeNetworkError).Returns(true);

      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces("Colombo", "Hotel");

      var objectResult = Assert.IsType<ObjectResult>(result);
      Assert.Equal(503, objectResult.StatusCode);
    }

    // ── Unexpected exception handling ─────────────────────────

    [Fact]
    public async Task GetNearbyPlaces_UnexpectedException_Returns500()
    {
      var serviceMock = CreateMockPlacesService();
      serviceMock.Setup(s => s.GeocodeCity("Colombo")).ThrowsAsync(new InvalidOperationException("boom"));

      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces("Colombo", "Hotel");

      var objectResult = Assert.IsType<ObjectResult>(result);
      Assert.Equal(500, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetNearbyPlaces_MongoConnectionException_Returns503()
    {
      var serviceMock = CreateMockPlacesService();
      serviceMock
          .Setup(s => s.GeocodeCity("Colombo"))
          .ThrowsAsync(new MongoConnectionException(
              new MongoDB.Driver.Core.Connections.ConnectionId(
                  new MongoDB.Driver.Core.Servers.ServerId(new MongoDB.Driver.Core.Clusters.ClusterId(), new System.Net.DnsEndPoint("localhost", 27017))),
              "connection failed"));

      var controller = CreateController(serviceMock);

      var result = await controller.GetNearbyPlaces("Colombo", "Hotel");

      var objectResult = Assert.IsType<ObjectResult>(result);
      Assert.Equal(503, objectResult.StatusCode);
    }
  }
}
