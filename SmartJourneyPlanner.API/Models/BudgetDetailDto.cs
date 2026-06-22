public class BudgetDetailDto
{
    public string TripName { get; set; }
    public string TripId { get; set; }
    public List<string> InvitedMembers { get; set; }
    public decimal ExpectedBudget { get; set; }
    public decimal TotalSpent { get; set; }
}