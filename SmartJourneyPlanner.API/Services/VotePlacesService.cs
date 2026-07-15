using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.Services
{
    public class VotePlacesService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public VotePlacesService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _apiKey = config["GoogleApi:ApiKey"] ?? "";
        }

       public async Task<string> AutocompleteAsync(string input, string? sessionToken = null)
        {
            var token = sessionToken ?? Guid.NewGuid().ToString();

            var url = $"https://maps.googleapis.com/maps/api/place/autocomplete/json" +
                      $"?input={Uri.EscapeDataString(input)}" +
                      $"&types=establishment|geocode" + // ← places + locations
                      $"&components=country:lk" +       //Only sri lankan places
                      $"&sessiontoken={token}" +
                      $"&key={_apiKey}";

            var response = await _httpClient.GetAsync(url);
            return await response.Content.ReadAsStringAsync();
        }

        /// <summary>
        /// Validates a place ID with an optional session token.
        /// </summary>
        /// <param name="placeId">The place ID to validate.</param>
        /// <param name="sessionToken">The session token for the validation request.</param>
        /// <returns>A task representing the asynchronous operation, with a boolean indicating if the place is valid.</returns>
        public async Task<bool> ValidatePlaceAsync(string placeId, string? sessionToken = null)
        {
            var token = sessionToken ?? Guid.NewGuid().ToString();

            var url = $"https://maps.googleapis.com/maps/api/place/details/json" +
                      $"?place_id={placeId}" +
                      $"&fields=name,geometry" +
                      $"&sessiontoken={token}" +
                      $"&key={_apiKey}";

            var response = await _httpClient.GetAsync(url);
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var status = doc.RootElement.GetProperty("status").GetString();
            return status == "OK";
        }
    }
}