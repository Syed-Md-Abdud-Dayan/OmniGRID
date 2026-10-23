from loan import Loan


class Meter:
    """Holds a customer's balance and links to their Loan."""

    def __init__(self, initial_bal: float, loan: Loan):
        self.bal = initial_bal
        self.loan = loan

    def recharge(self, amount: float) -> str:
        """
        Recharges the meter. Any outstanding loan is repaid first out of
        the recharge amount; only the remainder is added to the balance.
        Returns a summary string describing what happened.
        """
        if amount <= 0:
            return "Recharge amount must be positive."

        loan_before = self.loan.get_loan_amount()
        remaining_amt = self.loan.repay_loan(amount)
        repaid = loan_before - self.loan.get_loan_amount()
        self.bal += remaining_amt

        lines = [f"Recharge successful: BDT {amount:.2f}"]
        if repaid > 0:
            lines.append(f"BDT {repaid:.2f} deducted to repay loan.")
            if self.loan.get_loan_amount() > 0:
                lines.append(f"Remaining loan: BDT {self.loan.get_loan_amount():.2f}")
            else:
                lines.append("Loan fully repaid.")
        lines.append(f"New Meter Balance: BDT {self.bal:.2f}")
        return "\n".join(lines)

    def deduct_bal(self, amount: float) -> bool:
        """Deducts amount from balance if there's enough. Returns success."""
        if amount > 0 and self.bal >= amount:
            self.bal -= amount
            return True
        return False

    def get_balance(self) -> float:
        return self.bal
