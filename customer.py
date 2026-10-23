from loan import Loan
from meter import Meter


class Customer:
    """A customer with an ID, a meter number, and their own Meter/Loan."""

    def __init__(self, name: str, cust_id: str, meter_num: int, initial_bal: float):
        self.name = name
        self.cust_id = cust_id
        self.meter_num = meter_num
        self.meter = Meter(initial_bal, Loan())
