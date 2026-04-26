using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BudgetController : ControllerBase
    {
        private readonly BudgetService _budgetService;

        public BudgetController(BudgetService budgetService)
        {
            _budgetService = budgetService;
        }

        // The connector-Angular calls to load the budget page for a specific trip
        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetByTrip(string tripId)
        {
            var budget = await _budgetService.GetBudgetByTripIdAsync(tripId);
            
            // If no budget exists yet,return an empty container instead of a 404
            // the frontend can still show a "Total: 0" dashboard
            if (budget == null) 
            {
                return Ok(new TripBudget { TripId = tripId, Expenses = new List<Expense>() });
            }
            
            return Ok(budget);
        }

        // ADD EXPENSE
        [HttpPost("add-expense/{tripId}")]
        public async Task<IActionResult> AddExpense(string tripId, [FromBody] Expense expense)
        {
            //Validation check here to catch empty payloads before hitting the service.
            if (expense == null) return BadRequest("Expense data is missing.");
            
            await _budgetService.AddExpenseAsync(tripId, expense);
            return Ok(new { message = "Expense added and total updated!" });
        }

        // DELETE EXPENSE
        [HttpDelete("delete-expense/{tripId}/{expenseId}")]
        public async Task<IActionResult> DeleteExpense(string tripId, string expenseId)
        {
            //passing both IDs to ensure we are deleting the right expense
            await _budgetService.DeleteExpenseAsync(tripId, expenseId);
            return Ok(new { message = "Expense removed successfully." });
        }

        // UPDATE EXPENSE
        [HttpPut("update-expense/{tripId}/{expenseId}")]
        public async Task<IActionResult> UpdateExpense(string tripId, string expenseId, [FromBody] Expense updatedExpense)
        {
            var budget = await _budgetService.GetBudgetByTripIdAsync(tripId);
            if (budget == null) return NotFound("Budget container not found.");

            // Find the specific expense in the list using its ID
            var existingExpense = budget.Expenses.FirstOrDefault(e => e.Id == expenseId);
            if (existingExpense == null) return NotFound("Specific expense not found.");

            // Update fields (Description replaces Name based on your new Model)
            existingExpense.Description = updatedExpense.Description;
            existingExpense.Amount = updatedExpense.Amount;
            existingExpense.Category = updatedExpense.Category;
            existingExpense.Date = updatedExpense.Date;

            // Recalculate Total
            budget.TotalSpent = (double)budget.Expenses.Sum(e => e.Amount);

            await _budgetService.UpdateBudgetAsync(budget);
            return Ok(new { message = "Expense updated successfully." });
        }

        // INITIAL CREATE
        [HttpPost]
        public async Task<IActionResult> Create(TripBudget newBudget)
        {
            //Mandatory TripId check
            if (string.IsNullOrEmpty(newBudget.TripId)) return BadRequest("TripId is required.");
            
            await _budgetService.CreateBudgetAsync(newBudget);
            return Ok(newBudget);
        }
    }
}