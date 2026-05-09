using SmartJourneyPlanner.API.Models;
using System.Collections.Generic;

namespace SmartJourneyPlanner.API.Services
{
    public class WeatherSuggestionService
    {
        public WeatherSuggestionResult GenerateSuggestion(double temp, double humidity, string condition)
        {
            if (condition == "Rainy" || humidity > 80)
            {
                return new WeatherSuggestionResult {
                    Message = "It's likely to rain. Stay dry!",
                    Packing = new List<string> { "Umbrella", "Waterproof Jacket", "Quick-dry Socks" },
                    Outfit = new List<string> { "Anorak", "Waterproof ankle boots" },
                    Activity = new List<string> { "Play music", "Watch movie", "Reading", "Indoor games" }
                };
            }

            if (condition == "Sunny" && temp >= 20)
            {
                return new WeatherSuggestionResult {
                    Message = "Beautiful weather! Perfect for the outdoors.",
                    Packing = new List<string> { "Sunscreen", "Sunglasses", "Hat", "Water bottle" },
                    Outfit = new List<string> { "Linen/Cotton fabrics", "Sandals" },
                    Activity = new List<string> { "Hiking", "Beach/Pool", "Picnic" }
                };
            }

            if (condition == "Cloudy" || temp < 20)
            {
                return new WeatherSuggestionResult {
                    Message = "A bit overcast or cool. Dress in layers.",
                    Packing = new List<string> { "Light sweater", "Portable charger", "Camera" },
                    Outfit = new List<string> { "Layered clothes (T-shirt + Hoodie)", "Sneakers", "Jeans" },
                    Activity = new List<string> { "City walking tour", "Photography", "Cafe hopping" }
                };
            }

              // Fallback ensures system always returns a valid suggestion even for unexpected inputs
            return new WeatherSuggestionResult {
                Message = "Enjoy your trip!",
                Packing = new List<string> { "Water" },
                Outfit = new List<string> { "Casual" },
                Activity = new List<string> { "Sightseeing" }
            };
        }
    }
}