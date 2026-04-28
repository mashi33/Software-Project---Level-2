using MongoDB.Bson;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;

namespace SmartJourneyPlanner.API.Services
{
    public class WeatherSuggestionService
    {
        private readonly IMongoCollection<WeatherRule> _rules;

        public WeatherSuggestionService(IMongoDatabase database, IConfiguration config)
        {
            var collectionName = config.GetValue<string>("DatabaseSettings:WeatherCollectionName");
            _rules = database.GetCollection<WeatherRule>(collectionName);
        }

        public WeatherRule? GenerateSuggestion(double temp, string condition)
        {
            var filter = Builders<WeatherRule>.Filter.And(
                // Use case-insensitive regex matching to ensure valid rules are not missed
                Builders<WeatherRule>.Filter.Regex(weather => weather.Condition, new BsonRegularExpression($"^{condition}$", "i")),
                Builders<WeatherRule>.Filter.Lte(weather => weather.MinTemp, temp),
                Builders<WeatherRule>.Filter.Gte(weather => weather.MaxTemp, temp)
            );

            return _rules.Find(filter).FirstOrDefault();
        }
    }
}