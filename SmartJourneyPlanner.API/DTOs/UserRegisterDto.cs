namespace SmartJourneyPlanner.API.DTOs
{
    public class UserRegisterDto
    {
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string UserType { get; set; } = null!; // Traveller or TransportProvider
    }
}
