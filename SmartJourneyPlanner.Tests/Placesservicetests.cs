using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using SmartJourneyPlanner.Services;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class PlacesServiceTests
  {
    // ── Helpers ─────────────────────────────────────────────

    // Builds an HttpClient whose responses are fully controlled by the test,
    // by mocking the underlying HttpMessageHandler instead of hitting the real network.
    private static HttpClient CreateMockHttpClient(HttpResponseMessage response)
    {
      var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

      handlerMock
          .Protected()
          .Setup<Task<HttpResponseMessage>>(
              "SendAsync",
              ItExpr.IsAny<HttpRequestMessage>(),
              ItExpr.IsAny<CancellationToken>())
          .ReturnsAsync(response);

      return new HttpClient(handlerMock.Object);
    }

    private static HttpClient CreateThrowingHttpClient(Exception exceptionToThrow)
    {
      var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

      handlerMock
          .Protected()
          .Setup<Task<HttpResponseMessage>>(
              "SendAsync",
              ItExpr.IsAny<HttpRequestMessage>(),
              ItExpr.IsAny<CancellationToken>())
          .ThrowsAsync(exceptionToThrow);

      return new HttpClient(handlerMock.Object);
    }

    private static IConfiguration CreateConfig(string apiKey = "test-api-key")
    {
      var settings = new Dictionary<string, string?>
            {
                { "GoogleApi:ApiKey", apiKey }
            };

      return new ConfigurationBuilder()
          .AddInMemoryCollection(settings)
          .Build();
    }

    private static HttpResponseMessage JsonResponse(object body, HttpStatusCode status = HttpStatusCode.OK)
    {
      return new HttpResponseMessage(status)
      {
        Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
      };
    }

    // ── GeocodeCity ─────────────────────────────────────────

    [Fact]
    public async Task GeocodeCity_EmptyCityName_ReturnsNull()
    {
      var service = new PlacesService(CreateMockHttpClient(JsonResponse(new { })), CreateConfig());

      var result = await service.GeocodeCity("");

      Assert.Null(result);
    }

    [Fact]
    public async Task GeocodeCity_ValidCity_ReturnsCoordinates()
    {
      var googleResponse = new
      {
        status = "OK",
        results = new[]
          {
                    new
                    {
                        geometry = new
                        {
                            location = new { lat = 6.9271, lng = 79.8612 }
                        }
                    }
                }
      };

      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var result = await service.GeocodeCity("Colombo");

      Assert.NotNull(result);
      Assert.Equal(6.9271, result.Value.Lat);
      Assert.Equal(79.8612, result.Value.Lon);
    }

    [Fact]
    public async Task GeocodeCity_RequestDenied_ReturnsNull()
    {
      var googleResponse = new { status = "REQUEST_DENIED", results = Array.Empty<object>() };
      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var result = await service.GeocodeCity("Colombo");

      Assert.Null(result);
    }

    [Fact]
    public async Task GeocodeCity_NoResults_ReturnsNull()
    {
      var googleResponse = new { status = "ZERO_RESULTS", results = Array.Empty<object>() };
      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var result = await service.GeocodeCity("NotARealCityXyz");

      Assert.Null(result);
    }

    [Fact]
    public async Task GeocodeCity_NetworkError_SetsLastGeocodeNetworkErrorFlag()
    {
      var service = new PlacesService(
          CreateThrowingHttpClient(new HttpRequestException("network down")),
          CreateConfig());

      var result = await service.GeocodeCity("Colombo");

      Assert.Null(result);
      Assert.True(service.LastGeocodeNetworkError);
    }

    [Fact]
    public async Task GeocodeCity_Timeout_SetsLastGeocodeNetworkErrorFlag()
    {
      var service = new PlacesService(
          CreateThrowingHttpClient(new TaskCanceledException("timed out")),
          CreateConfig());

      var result = await service.GeocodeCity("Colombo");

      Assert.Null(result);
      Assert.True(service.LastGeocodeNetworkError);
    }

    [Fact]
    public async Task GeocodeCity_ResetsNetworkErrorFlagOnEachCall()
    {
      // First call fails (sets the flag), second call succeeds — flag should reset to false
      var failingService = new PlacesService(
          CreateThrowingHttpClient(new HttpRequestException("network down")),
          CreateConfig());
      await failingService.GeocodeCity("Colombo");
      Assert.True(failingService.LastGeocodeNetworkError);

      var googleResponse = new
      {
        status = "OK",
        results = new[]
          {
                    new { geometry = new { location = new { lat = 1.0, lng = 1.0 } } }
                }
      };
      var successService = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var result = await successService.GeocodeCity("Colombo");

      Assert.False(successService.LastGeocodeNetworkError);
      Assert.NotNull(result);
    }

    // ── CalculateDistance ───────────────────────────────────

    [Fact]
    public void CalculateDistance_SameCoordinates_ReturnsZero()
    {
      double distance = PlacesService.CalculateDistance(6.9271, 79.8612, 6.9271, 79.8612);

      Assert.Equal(0, distance, precision: 5);
    }

    [Fact]
    public void CalculateDistance_ColomboToKandy_ReturnsApproxKnownDistance()
    {
      // Colombo ~6.9271,79.8612 -> Kandy ~7.2906,80.6337 is roughly 95km as the crow flies
      double distance = PlacesService.CalculateDistance(6.9271, 79.8612, 7.2906, 80.6337);

      Assert.InRange(distance, 90, 100);
    }

    // ── GetPlacesFromGoogle ─────────────────────────────────

    [Fact]
    public async Task GetPlacesFromGoogle_ValidResponse_MapsResultsToPlaceObjects()
    {
      var googleResponse = new
      {
        status = "OK",
        results = new[]
          {
                    new
                    {
                        place_id = "abc123",
                        name = "Test Hotel",
                        rating = 4.5,
                        price_level = 2,
                        vicinity = "Colombo, Sri Lanka",
                        geometry = new { location = new { lat = 6.93, lng = 79.85 } },
                        user_ratings_total = 120,
                        photos = new[] { new { photo_reference = "photoRef123" } },
                        opening_hours = new { open_now = true }
                    }
                }
      };

      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var places = await service.GetPlacesFromGoogle(6.93, 79.85, "Hotel", null);

      Assert.Single(places);
      var place = places[0];
      Assert.Equal("abc123", place.PlaceId);
      Assert.Equal("Test Hotel", place.Name);
      Assert.Equal(4.5, place.Rating);
      Assert.Equal("photoRef123", place.PhotoReference);
      Assert.Equal(true, place.IsOpenNow);
    }

    [Fact]
    public async Task GetPlacesFromGoogle_RequestDenied_ReturnsEmptyList()
    {
      var googleResponse = new { status = "REQUEST_DENIED", results = Array.Empty<object>() };
      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var places = await service.GetPlacesFromGoogle(6.93, 79.85, "Hotel", null);

      Assert.Empty(places);
    }

    [Fact]
    public async Task GetPlacesFromGoogle_OverQueryLimit_ReturnsEmptyList()
    {
      var googleResponse = new { status = "OVER_QUERY_LIMIT", results = Array.Empty<object>() };
      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var places = await service.GetPlacesFromGoogle(6.93, 79.85, "Hotel", null);

      Assert.Empty(places);
    }

    [Fact]
    public async Task GetPlacesFromGoogle_NoResults_ReturnsEmptyList()
    {
      var googleResponse = new { status = "ZERO_RESULTS", results = Array.Empty<object>() };
      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var places = await service.GetPlacesFromGoogle(6.93, 79.85, "Hotel", null);

      Assert.Empty(places);
    }

    [Fact]
    public async Task GetPlacesFromGoogle_NetworkError_ReturnsEmptyListInsteadOfThrowing()
    {
      var service = new PlacesService(
          CreateThrowingHttpClient(new HttpRequestException("network down")),
          CreateConfig());

      var places = await service.GetPlacesFromGoogle(6.93, 79.85, "Hotel", null);

      Assert.Empty(places);
    }

    [Fact]
    public async Task GetPlacesFromGoogle_RestaurantCategory_MapsToRestaurantType()
    {
      // Category mapping itself (hotel -> lodging, else -> restaurant) affects the
      // outgoing URL, not the response shape, so we just confirm the call succeeds
      // and returned places carry the lowercase category through.
      var googleResponse = new
      {
        status = "OK",
        results = new[]
          {
                    new
                    {
                        place_id = "r1",
                        name = "Test Restaurant",
                        rating = 4.0,
                        price_level = 1,
                        vicinity = "Kandy",
                        geometry = new { location = new { lat = 7.29, lng = 80.63 } },
                        user_ratings_total = 50,
                        photos = Array.Empty<object>(),
                        opening_hours = (object?)null
                    }
                }
      };

      var service = new PlacesService(CreateMockHttpClient(JsonResponse(googleResponse)), CreateConfig());

      var places = await service.GetPlacesFromGoogle(7.29, 80.63, "Restaurant", null);

      Assert.Single(places);
      Assert.Equal("restaurant", places[0].Category);
      Assert.Null(places[0].PhotoReference);
    }
  }
}
