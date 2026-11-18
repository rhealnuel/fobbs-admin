export type RoomStatus = "Available" | "Occupied" | "Cleaning" | "Maintenance" | "Out of Service";
export type HkStatus = "Dirty" | "Cleaning in Progress" | "Awaiting Inspection" | "Clean / Ready";
export type ResStatus = "Pending Payment" | "Confirmed" | "Checked In" | "Checked Out" | "Cancelled" | "No-show" | "Refund Pending" | "Refunded";
export type PayMethod = "Cash" | "Bank transfer" | "POS/Card";
export type PayStatus = "Unpaid" | "Part paid" | "Paid";
export type OrderStatus = "Draft" | "Submitted" | "Accepted" | "Preparing" | "Ready" | "Served" | "Completed" | "Cancelled";
export type OrderType = "Table order" | "Walk-in order" | "Customer tab" | "Takeaway";
export type MaintStatus = "Reported" | "Assigned" | "In Progress" | "Resolved" | "Closed";

export interface Staff { id: string; name: string; email: string; phone: string; roleId: string; extraRoleIds: string[]; dept: "Hotel" | "Lounge" | "Management"; status: "Active" | "Suspended" | "Deactivated"; password: string }
export interface Role { id: string; name: string; scope: "hotel" | "lounge" | "both"; permissions: string[]; system?: boolean }
export interface Category { id: string; slug: string; name: string; description: string; photo: string; price: number; maxGuests: number; bed: string; bathrooms: number; amenities: string[]; bookable: boolean; published: boolean }
export interface Room { id: string; number: string; categoryId: string; floor: string; notes: string; status: RoomStatus; hk: HkStatus; active: boolean; history: { at: string; text: string; by: string }[] }
export interface Guest { id: string; name: string; phone: string; email: string; idType: string; idNumber: string; notes: string; preferences: string }
export interface ActivityNote { at: string; by: string; text: string }
export interface Reservation {
  id: string; ref: string; guestId: string; categoryId: string; roomId: string | null;
  checkIn: string; checkOut: string; guests: number; requests: string; source: string;
  status: ResStatus; amount: number; createdBy: string; createdAt: string;
  actualIn?: string; actualOut?: string; history: ActivityNote[];
}
export interface Payment { id: string; kind: "hotel" | "lounge"; refId: string; amount: number; method: PayMethod; staffId: string; at: string; shiftId?: string; verified: boolean; note?: string }
export interface Maintenance { id: string; roomId: string | null; facility: string; issue: string; priority: "Low" | "Medium" | "High" | "Urgent"; status: MaintStatus; assignedTo: string | null; reportedBy: string; at: string; log: ActivityNote[] }
export interface Product { id: string; name: string; category: string; price: number; cost: number | null; sku: string; unit: string; track: boolean; active: boolean; stock: number; lowAt: number }
export interface OrderItem { productId: string; name: string; price: number; qty: number }
export interface Order {
  id: string; ref: string; type: OrderType; table: string | null; customer: string; items: OrderItem[]; note: string;
  status: OrderStatus; waiterId: string; shiftId: string | null; at: string; discount: number; discountReason?: string;
  cancelReason?: string; history: ActivityNote[];
}
export interface Shift {
  id: string; staffId: string; start: string; end: string | null; float: number;
  status: "Open" | "Submitted" | "Approved" | "Rejected" | "Flagged";
  actual?: { cash: number; transfer: number; pos: number }; staffNote?: string; managerNote?: string; reviewedBy?: string;
}
export interface StockMove { id: string; productId: string; qty: number; type: "Purchase" | "Received" | "Sale" | "Sale reversal" | "Breakage" | "Wastage" | "Complimentary" | "Adjustment"; at: string; staffId: string; reason: string }
export interface Activity { id: string; staffId: string; action: string; record: string; at: string; prev?: string; next?: string; reason?: string }
export interface Notice { id: string; text: string; href: string; at: string; read: boolean; perm: string }
export interface Expense { id: string; category: string; amount: number; description: string; method: PayMethod; staffId: string; at: string; receipt?: string; status: "Pending" | "Approved" | "Rejected"; reviewedBy?: string; reviewNote?: string }
export interface Refund { id: string; kind: "hotel" | "lounge"; refId: string; paymentId: string; amount: number; reason: string; status: "Requested" | "Approved" | "Rejected" | "Completed"; requestedBy: string; at: string; reviewedBy?: string; reviewNote?: string; completedAt?: string; completedBy?: string }
export interface Settings {
  tables: string[]; hotelName: string; address: string; phone: string; email: string; whatsapp: string; currency: string; timezone: string;
  checkInTime: string; checkOutTime: string; cancellationPolicy: string; confirmationNote: string; loungeName: string; receiptFooter: string;
  expenseCategories: string[]; notify: { booking: boolean; payment: boolean; lowStock: boolean; shift: boolean; recon: boolean };
}

export interface DB {
  staff: Staff[]; roles: Role[]; categories: Category[]; rooms: Room[]; guests: Guest[]; reservations: Reservation[];
  payments: Payment[]; maintenance: Maintenance[]; products: Product[]; orders: Order[]; shifts: Shift[];
  stock: StockMove[]; activity: Activity[]; notices: Notice[]; expenses: Expense[]; refunds: Refund[]; settings: Settings; seq: number;
}
