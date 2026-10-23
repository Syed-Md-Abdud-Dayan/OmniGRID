from meter import Meter

RATE_PER_UNIT = 5.5  # BDT per unit consumed


class Bill:
    """Calculates a bill for units consumed and applies it to a Meter."""

    def __init__(self, units: float, meter: Meter):
        self.units = units
        self.meter = meter

    def process_bill(self) -> str:
        amount = self.units * RATE_PER_UNIT
        lines = [
            f"Units Consumed: {self.units:.2f}",
            f"Bill Amount: BDT {amount:.2f} (at BDT {RATE_PER_UNIT:.2f}/unit)",
        ]

        if self.meter.deduct_bal(amount):
            lines.append(f"Bill paid from balance. New Balance: BDT {self.meter.get_balance():.2f}")
        else:
            available = self.meter.get_balance()
            shortfall = amount - available
            self.meter.deduct_bal(available)  # use up whatever balance remains
            self.meter.loan.take_loan(shortfall)
            lines.append(f"Insufficient balance. BDT {available:.2f} paid from balance, "
                          f"BDT {shortfall:.2f} added to loan.")
            lines.append(f"New Balance: BDT {self.meter.get_balance():.2f}, "
                          f"Total Loan: BDT {self.meter.loan.get_loan_amount():.2f}")
        return "\n".join(lines)
