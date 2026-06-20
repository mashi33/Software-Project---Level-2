using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

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
        [Authorize] // Requires valid authentication to track who is saving data
        public async Task<IActionResult> AddExpense(string tripId, [FromBody] Expense expense)
        {
            //Validation check here to catch empty payloads before hitting the service.
            if (expense == null) return BadRequest("Expense data is missing.");
            
            if (expense.Amount <= 0) 
            {
                return BadRequest(new { message = "Amount cannot be zero or negative." });
            }

            // Intercept the identity token claims and tag this record with the creator's email address
            var currentUserEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(currentUserEmail))
            {
                expense.AddedBy = currentUserEmail; // Links data entry right to your frontend row constraints
            }
            
            await _budgetService.AddExpenseAsync(tripId, expense);
            return Ok(new { message = "Expense added and total updated!" });
        }

        // DELETE EXPENSE
        [HttpDelete("delete-expense/{tripId}/{expenseId}")]
        [Authorize] // 🆕 ADDED: Protects API route from manual tampering via Postman/Insomnia bypasses
        public async Task<IActionResult> DeleteExpense(string tripId, string expenseId)
        {
            // 1. Grab the email of the person making the request from the security token
            var currentUserEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserEmail)) return Unauthorized(new { message = "User identity context invalid." });

            // 2. Fetch the target sub-document tree through your teammate's existing service abstraction
            var budget = await _budgetService.GetBudgetByTripIdAsync(tripId);
            if (budget == null) return NotFound(new { message = "Budget tracker not found." });

            var existingExpense = budget.Expenses?.FirstOrDefault(e => e.Id == expenseId);
            if (existingExpense == null) return NotFound(new { message = "Target expense record not found in system." });

            // 3. 🛡️ ROW-LEVEL ACCESS AUDIT CHECK: Block if non-owner modifies records
            if (existingExpense.AddedBy != currentUserEmail)
            {
                return StatusCode(403, new { message = "Access Denied: You cannot delete an expense created by another member." });
            }

            // 4. If authorization validation succeeds, allow your teammate's exact execution logic to run
            await _budgetService.DeleteExpenseAsync(tripId, expenseId);
            return Ok(new { message = "Expense removed successfully." });
        }

        // UPDATE EXPENSE
        [HttpPut("update-expense/{tripId}/{expenseId}")]
        [Authorize] // 🆕 ADDED: Protects record update lifecycle pipeline
        public async Task<IActionResult> UpdateExpense(string tripId, string expenseId, [FromBody] Expense updatedExpense)
        {
            if (updatedExpense == null) return BadRequest("Updated data is required.");

            // 1. Extract email token claim signature
            var currentUserEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserEmail)) return Unauthorized(new { message = "User identity context invalid." });

            // 2. Pull down original baseline dataset
            var budget = await _budgetService.GetBudgetByTripIdAsync(tripId);
            if (budget == null) return NotFound("Budget container not found.");

            // Find the specific expense in the list using its ID
            var existingExpense = budget.Expenses?.FirstOrDefault(e => e.Id == expenseId);
            if (existingExpense == null) return NotFound("Specific expense not found.");

            // 3. 🛡️ ROW-LEVEL ACCESS AUDIT CHECK: Block if non-owner modifies records
            if (existingExpense.AddedBy != currentUserEmail)
            {
                return StatusCode(403, new { message = "Access Denied: You cannot modify an expense created by another member." });
            }
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