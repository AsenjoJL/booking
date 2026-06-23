namespace Booking.Domain.Enums;

public enum OrderStatus
{
    Pending = 0,
    Processing = 1,
    Paid = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5,
    PendingPayment = 6,
    Confirmed = 7,
    Expired = 8,
    Refunded = 9,
    OutForDelivery = 10
}
