class Loan:
    """Tracks an outstanding loan balance for a customer's meter."""

    def __init__(self):
        self.loan_amt = 0.0

    def take_loan(self, amount: float) -> None:
        self.loan_amt += amount

    def repay_loan(self, recharge: float) -> float:
        """
        Uses part (or all) of a recharge amount to pay down the loan.
        Returns whatever is left over after repayment, which the caller
        should add to the meter balance.
        """
        if self.loan_amt > 0 and recharge > 0:
            if recharge >= self.loan_amt:
                repay = self.loan_amt
                self.loan_amt = 0.0
            else:
                repay = recharge
                self.loan_amt -= repay
            return recharge - repay
        return recharge

    def get_loan_amount(self) -> float:
        return self.loan_amt
