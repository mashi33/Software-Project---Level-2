namespace SmartJourneyPlanner.API.Models
{
    public class EmailSettings
    {
        public string? Email { get; set; }//can't be null because we need it to send emails
        public string? Password { get; set; }
    }
}