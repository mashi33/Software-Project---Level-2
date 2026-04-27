namespace SmartJourneyPlanner.API.Models
{
    public class WeatherSuggestionResult
    {
        public string Message { get; set; } = string.Empty;
        public List<string> Packing { get; set; } = new();
        public List<string> Outfit { get; set; } = new();
        public List<string> Activity { get; set; } = new();
    }
}

