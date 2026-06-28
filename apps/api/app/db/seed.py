"""Rich, deterministic dev seed. Run with: ``python -m app.db.seed`` (from apps/api).

Populates realistic volume so every frontend page renders full data. Idempotent:
it wipes the domain tables first, then reseeds with a FIXED random seed.

Login: owner@apexmotors.in / password
"""

from __future__ import annotations

import logging
import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.base import utcnow
from app.db.models import (
    Agent,
    AgentAction,
    AgentExecution,
    Appointment,
    AuditLog,
    Customer,
    Dealership,
    InventoryItem,
    InventoryTransaction,
    Invoice,
    Notification,
    Payment,
    PredictedMaintenance,
    PurchaseOrder,
    PurchaseOrderItem,
    Role,
    ServiceBay,
    Supplier,
    Technician,
    TelematicsEvent,
    User,
    Vehicle,
    WorkOrder,
    WorkOrderItem,
    user_roles,
)
from app.db.models.enums import (
    AppointmentStatus,
    InvoiceStatus,
    PaymentMethod,
    PurchaseOrderStatus,
    ServiceBayStatus,
    StepStatus,
    WorkOrderStatus,
)
from app.db.session import SessionLocal, create_all
from app.workflows.engine import WorkflowEngine

logger = logging.getLogger("halo.seed")

rng = random.Random(20260628)
NOW = datetime.now(timezone.utc)

# ---------------------------------------------------------------------------
# Static pools
# ---------------------------------------------------------------------------
FIRST_NAMES = [
    "Aarav", "Vivaan", "Ananya", "Diya", "Arjun", "Ishaan", "Saanvi", "Aditya",
    "Kavya", "Reyansh", "Myra", "Vihaan", "Anika", "Kabir", "Sara", "Rohan",
    "Meera", "Karan", "Neha", "Dev", "Priya", "Vikram", "Riya", "Aryan",
]
LAST_NAMES = [
    "Sharma", "Verma", "Iyer", "Nair", "Rao", "Banerjee", "Pillai", "Mehta",
    "Kapoor", "Sethi", "Gupta", "Reddy", "Singh", "Patel", "Joshi", "Desai",
]
CITIES = ["Mumbai", "Pune", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Ahmedabad"]
COLORS = ["Pearl White", "Midnight Black", "Steel Grey", "Racing Red", "Ocean Blue", "Silver"]
VARIANTS = ["LX", "VX", "ZX", "Sport", "Signature", "Plus"]
VEHICLE_CATALOG = [
    ("Tata", ["Nexon EV", "Harrier", "Punch", "Altroz"]),
    ("Maruti Suzuki", ["Swift", "Baleno", "Brezza", "Grand Vitara"]),
    ("Hyundai", ["Creta", "Venue", "i20", "Verna"]),
    ("Mahindra", ["XUV700", "Thar", "Scorpio-N", "XUV300"]),
    ("Toyota", ["Innova", "Fortuner", "Glanza"]),
    ("Kia", ["Seltos", "Sonet", "Carens"]),
]
REG_CODES = ["MH01", "MH02", "MH12", "KA03", "DL08", "TS09", "GJ05"]
SERVICE_TYPES = [
    "Periodic Service", "Brake Service", "Battery Replacement", "Tyre Rotation",
    "AC Service", "Engine Diagnostics", "Oil Change", "Wheel Alignment",
]
TECH_SPECIALTIES = [
    "Engine", "Electrical", "Brakes & Suspension", "Diagnostics",
    "Transmission", "AC & Climate", "Bodywork", "EV Systems",
]
PART_CATEGORIES = ["Brakes", "Filters", "Fluids", "Electrical", "Engine", "Tyres", "Suspension"]
PART_NAMES = {
    "Brakes": ["Front Brake Pad Set", "Rear Brake Pad Set", "Brake Disc", "Brake Fluid DOT4"],
    "Filters": ["Air Filter", "Oil Filter", "Cabin Filter", "Fuel Filter"],
    "Fluids": ["Engine Oil 5W-30", "Coolant", "Power Steering Fluid", "Gear Oil"],
    "Electrical": ["12V Battery", "Spark Plug Set", "Alternator", "Headlight Assembly"],
    "Engine": ["Timing Belt", "Water Pump", "Radiator", "Drive Belt"],
    "Tyres": ["Tyre 195/65 R15", "Tyre 215/60 R16", "Tyre 175/70 R14"],
    "Suspension": ["Shock Absorber", "Control Arm", "Wheel Bearing", "Tie Rod End"],
}
SUPPLIER_NAMES = [
    "Bosch Parts India", "Apollo Tyres", "Exide Industries", "MRF Distributors",
    "Mahle Filters", "Castrol Lubricants", "Lucas TVS", "Gabriel India",
    "Amaron Batteries", "ZF Aftermarket",
]

ROLES = [
    ("owner", "Owner", "Full administrative access"),
    ("general_manager", "General Manager", "Oversees operations"),
    ("service_advisor", "Service Advisor", "Manages service operations"),
    ("parts_manager", "Parts Manager", "Manages inventory and procurement"),
    ("finance", "Finance", "Manages finance"),
    ("technician", "Technician", "Performs service work"),
]

USERS = [
    ("owner", "Rohan Kapoor", "owner@apexmotors.in"),
    ("general_manager", "Meera Iyer", "meera@apexmotors.in"),
    ("service_advisor", "Karan Sethi", "karan@apexmotors.in"),
    ("parts_manager", "Vikram Rao", "vikram@apexmotors.in"),
    ("finance", "Neha Banerjee", "neha@apexmotors.in"),
    ("technician", "Dev Pillai", "dev@apexmotors.in"),
]


def _name() -> str:
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"


def _dt(days_ago: float) -> datetime:
    return NOW - timedelta(days=days_ago)


def _vin() -> str:
    chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
    return "".join(rng.choice(chars) for _ in range(17))


def _avatar(seed: str) -> str:
    return f"https://i.pravatar.cc/128?u={seed}"


def _weighted(pairs):
    population = [p[0] for p in pairs]
    weights = [p[1] for p in pairs]
    return rng.choices(population, weights=weights, k=1)[0]


# ---------------------------------------------------------------------------
# Wipe
# ---------------------------------------------------------------------------
_WIPE_ORDER = [
    Payment, Invoice, WorkOrderItem, WorkOrder, Appointment, ServiceBay, Technician,
    PurchaseOrderItem, PurchaseOrder, InventoryTransaction, InventoryItem, Supplier,
    PredictedMaintenance, TelematicsEvent, Vehicle, Customer, Notification,
    AgentAction, Agent, AgentExecution, AuditLog,
]


def _wipe(db: Session) -> None:
    from app.db.models.workflow import WorkflowExecution, WorkflowStep

    db.execute(delete(WorkflowStep))
    db.execute(delete(WorkflowExecution))
    for model in _WIPE_ORDER:
        db.execute(delete(model))
    db.execute(delete(user_roles))
    db.execute(delete(User))
    db.execute(delete(Dealership))
    db.commit()


def seed() -> None:
    create_all()
    db: Session = SessionLocal()
    try:
        _wipe(db)

        # --- Roles ---
        role_objs: dict[str, Role] = {}
        for key, name, desc in ROLES:
            r = db.scalar(__import__("sqlalchemy").select(Role).filter_by(key=key))
            if r is None:
                r = Role(key=key, name=name, description=desc)
                db.add(r)
            role_objs[key] = r
        db.flush()

        # --- Dealership ---
        dealership = Dealership(
            name="Apex Motors — Bandra Kurla",
            legal_name="Apex Motors Pvt Ltd",
            gstin="27AAPCA1234M1Z5",
            city="Mumbai",
        )
        db.add(dealership)
        db.flush()

        # --- Users ---
        for role_key, full_name, email in USERS:
            u = User(
                email=email,
                full_name=full_name,
                hashed_password=hash_password("password"),
                dealership_id=dealership.id,
            )
            u.roles = [role_objs[role_key]]
            db.add(u)
        db.flush()

        # --- Customers ---
        customers: list[Customer] = []
        for i in range(40):
            name = _name()
            c = Customer(
                dealership_id=dealership.id,
                full_name=name,
                email=f"{name.split(' ')[0].lower()}.{i}@gmail.com",
                phone=f"+91 {rng.randint(70, 99)}{rng.randint(10000000, 99999999)}",
                whatsapp_opt_in=rng.random() < 0.82,
                whatsapp_reachable=rng.random() < 0.74,
                city=rng.choice(CITIES),
                loyalty_tier=_weighted([("platinum", 1), ("gold", 2), ("silver", 4), ("bronze", 5)]),
                loyalty_points=rng.randint(0, 12000),
                satisfaction_score=rng.randint(62, 99),
                last_visit_at=(_dt(rng.randint(2, 200))).date(),
                created_at=_dt(rng.randint(20, 720)),
            )
            db.add(c)
            customers.append(c)
        db.flush()

        # --- Vehicles (+ telematics + predicted maintenance) ---
        vehicles: list[Vehicle] = []
        target_vehicles = 60
        while len(vehicles) < target_vehicles:
            for c in customers:
                if len(vehicles) >= target_vehicles:
                    break
                n_v = _weighted([(1, 6), (2, 3)])
                # only add if customer not yet given vehicles in this pass beyond cap
                for _ in range(n_v):
                    if len(vehicles) >= target_vehicles:
                        break
                    make, models = rng.choice(VEHICLE_CATALOG)
                    mileage = rng.randint(5_000, 140_000)
                    brake = rng.randint(8, 99)
                    battery = rng.randint(40, 100)
                    v = Vehicle(
                        dealership_id=dealership.id,
                        customer_id=c.id,
                        vin=_vin(),
                        chassis_no=f"MA{rng.randint(100000, 999999)}{rng.choice('XYZ')}",
                        registration_no=f"{rng.choice(REG_CODES)} {rng.choice(['AB','CJ','KL','ZX'])} {rng.randint(1000,9999)}",
                        make=make,
                        model=rng.choice(models),
                        variant=rng.choice(VARIANTS),
                        color=rng.choice(COLORS),
                        year=rng.randint(2017, 2025),
                        odometer_km=mileage,
                        brake_life_pct=brake,
                        battery_health_pct=battery,
                        next_service_due_km=mileage + rng.randint(500, 5000),
                        warranty_until=(_dt(-rng.randint(30, 900)).date() if rng.random() < 0.55 else None),
                        image_url=None,
                        created_at=_dt(rng.randint(60, 1400)),
                    )
                    db.add(v)
                    vehicles.append(v)
                # break inner customer loop only when cap hit; otherwise continue to next customer
            # if we looped all customers and still short, loop again (handles cap)
        db.flush()

        # telematics + predictions
        for v in vehicles:
            comps = [
                ("brake_wear", "Front Brake Pad Life", "%", v.brake_life_pct),
                ("battery", "Battery Health", "%", v.battery_health_pct),
                ("tyre_pressure", "Tyre Pressure (FL)", "psi", rng.randint(26, 36)),
                ("engine", "Engine Temp", "°C", rng.randint(82, 110)),
            ]
            rng.shuffle(comps)
            for etype, label, unit, value in comps[: rng.randint(1, 3)]:
                severity = "critical" if (unit == "%" and value < 25) else "warning" if (unit == "%" and value < 45) else "info"
                rec = _dt(rng.randint(0, 25))
                db.add(
                    TelematicsEvent(
                        vehicle_id=v.id,
                        event_type=etype,
                        severity=severity,
                        payload={"label": label, "value": value, "unit": unit, "recordedAt": rec.isoformat()},
                        created_at=rec,
                    )
                )
            health = round((v.brake_life_pct + v.battery_health_pct) / 2)
            if health < 78 and rng.random() < 0.7:
                db.add(
                    PredictedMaintenance(
                        vehicle_id=v.id,
                        component=rng.choice(["Brake Pads", "Battery", "Clutch", "Tyres", "Timing Belt"]),
                        remaining_pct=rng.randint(8, 35),
                        predicted_due=(_dt(-rng.randint(5, 60))).date(),
                        estimated_cost_minor=rng.randint(3_000, 45_000) * 100,
                        confidence_pct=rng.randint(72, 97),
                    )
                )
        db.flush()

        # --- Technicians ---
        technicians: list[Technician] = []
        for i in range(8):
            t = Technician(
                dealership_id=dealership.id,
                full_name=_name(),
                specialization=TECH_SPECIALTIES[i],
                is_available=rng.random() < 0.6,
                avatar_url=_avatar(f"tech-{i}"),
                utilization_pct=rng.randint(45, 98),
                rating_x10=rng.randint(38, 50),
                jobs_completed_today=rng.randint(0, 6),
                created_at=_dt(rng.randint(100, 600)),
            )
            db.add(t)
            technicians.append(t)
        db.flush()

        # --- Suppliers ---
        suppliers: list[Supplier] = []
        for i, sname in enumerate(SUPPLIER_NAMES):
            s = Supplier(
                dealership_id=dealership.id,
                name=sname,
                contact_name=_name(),
                contact_email=f"orders@{sname.split(' ')[0].lower()}.com",
                contact_phone=f"+91 {rng.randint(22, 80)} {rng.randint(20000000, 49999999)}",
                lead_time_days=rng.randint(2, 14),
                rating_x10=rng.randint(35, 50),
                on_time_delivery_pct=rng.randint(78, 99),
                status=_weighted([("active", 8), ("on_hold", 1), ("inactive", 1)]),
                created_at=_dt(rng.randint(200, 1000)),
            )
            db.add(s)
            suppliers.append(s)
        db.flush()

        # --- Inventory (+ transactions) ---
        inventory: list[InventoryItem] = []
        sku_counter = 1000
        for category in PART_CATEGORIES:
            for part in PART_NAMES[category]:
                supplier = rng.choice(suppliers)
                safety = rng.randint(8, 40)
                reorder = safety + rng.randint(5, 25)
                current = _weighted([
                    (rng.randint(0, max(0, safety - 1)), 2),
                    (rng.randint(safety, reorder), 3),
                    (rng.randint(reorder, reorder + 80), 5),
                    (rng.randint(reorder + 80, reorder + 300), 1),
                ])
                demand = rng.randint(5, 90)
                item = InventoryItem(
                    dealership_id=dealership.id,
                    supplier_id=supplier.id,
                    sku=f"{category[:3].upper()}-{sku_counter}",
                    name=part,
                    category=category,
                    unit_cost_minor=rng.randint(250, 24_000) * 100,
                    unit_price_minor=rng.randint(300, 30_000) * 100,
                    quantity_on_hand=current,
                    quantity_reserved=0,
                    reorder_point=reorder,
                    safety_stock=safety,
                    predicted_demand_30d=demand,
                    abc_class=_weighted([("A", 2), ("B", 3), ("C", 5)]),
                    warehouse_location=f"{rng.choice('ABCD')}-{rng.randint(1,24)}-{rng.randint(1,6)}",
                    lead_time_days=supplier.lead_time_days,
                    created_at=_dt(rng.randint(100, 800)),
                )
                db.add(item)
                inventory.append(item)
                sku_counter += 1
                db.flush()
                from app.db.models.enums import InventoryTransactionType as ITT

                for _ in range(rng.randint(2, 5)):
                    db.add(
                        InventoryTransaction(
                            inventory_item_id=item.id,
                            type=rng.choice(list(ITT)),
                            quantity_delta=rng.randint(1, 30),
                            reference=f"REF-{rng.randint(10000, 99999)}",
                            note=rng.choice(["Service consumption", "Goods receipt", "Cycle count"]),
                            created_at=_dt(rng.randint(0, 40)),
                        )
                    )
        db.flush()

        # --- Service bays (most occupied with full detail) ---
        bays: list[ServiceBay] = []
        for i in range(8):
            occupied = (i < 6 and rng.random() < 0.85) or (i >= 6 and rng.random() < 0.4)
            status = ServiceBayStatus.maintenance if i == 7 else (
                ServiceBayStatus.occupied if occupied else ServiceBayStatus.available
            )
            bay = ServiceBay(dealership_id=dealership.id, name=f"Bay {i + 1}", status=status, created_at=_dt(400))
            if status == ServiceBayStatus.occupied:
                tech = rng.choice(technicians)
                veh = rng.choice(vehicles)
                bay.current_technician_id = tech.id
                bay.current_technician_name = tech.full_name
                bay.current_vehicle_id = veh.id
                bay.current_vehicle_label = f"{veh.make} {veh.model} · {veh.registration_no}"
                bay.current_work_order_no = f"WO-2026-{1300 + i}"
                bay.job_status = rng.choice(["open", "awaiting_parts", "in_progress", "completed"])
                bay.progress_pct = rng.randint(10, 95)
                bay.eta_minutes = rng.randint(15, 180)
                bay.parts_ready = rng.random() < 0.7
            db.add(bay)
            bays.append(bay)
        db.flush()

        # --- Appointments ---
        appt_statuses = list(AppointmentStatus)
        for _ in range(30):
            v = rng.choice(vehicles)
            offset = rng.randint(-3, 12)
            if offset < 0:
                st = rng.choice([AppointmentStatus.completed, AppointmentStatus.no_show])
            elif offset == 0:
                st = rng.choice([AppointmentStatus.scheduled, AppointmentStatus.in_progress])
            else:
                st = rng.choice(appt_statuses)
            sched = _dt(-offset + rng.uniform(0.2, 0.6))
            db.add(
                Appointment(
                    dealership_id=dealership.id,
                    customer_id=v.customer_id,
                    vehicle_id=v.id,
                    service_bay_id=None,
                    scheduled_start=sched,
                    status=st,
                    reason=rng.choice(SERVICE_TYPES),
                    created_at=_dt(max(0, offset)),
                )
            )
        db.flush()

        # --- Work orders (+ items, varied statuses) ---
        wo_statuses = list(WorkOrderStatus)
        for i in range(24):
            v = rng.choice(vehicles)
            tech = rng.choice(technicians)
            status = rng.choice(wo_statuses)
            wo = WorkOrder(
                dealership_id=dealership.id,
                customer_id=v.customer_id,
                vehicle_id=v.id,
                technician_id=tech.id,
                number=f"WO-2026-{1200 + i}",
                status=status,
                summary=rng.choice(SERVICE_TYPES),
                created_at=_dt(rng.randint(0, 14)),
            )
            db.add(wo)
            db.flush()
            labor = 0
            parts = 0
            for _ in range(rng.randint(1, 4)):
                is_part = rng.random() < 0.6
                price = rng.randint(800, 18_000) * 100
                qty = rng.randint(1, 4) if is_part else 1
                db.add(
                    WorkOrderItem(
                        work_order_id=wo.id,
                        description=(rng.choice(PART_NAMES[rng.choice(PART_CATEGORIES)]) if is_part else rng.choice(SERVICE_TYPES)),
                        quantity=qty,
                        unit_price_minor=price,
                        is_labor=not is_part,
                    )
                )
                if is_part:
                    parts += price * qty
                else:
                    labor += price * qty
            wo.parts_amount_minor = parts
            wo.labor_amount_minor = labor
        db.flush()

        # --- Purchase orders (+ items) ---
        po_statuses = list(PurchaseOrderStatus)
        for i in range(18):
            supplier = rng.choice(suppliers)
            # ensure some submitted/draft for pending counts
            status = (
                PurchaseOrderStatus.submitted if i < 4 else
                PurchaseOrderStatus.draft if i < 7 else
                rng.choice(po_statuses)
            )
            po = PurchaseOrder(
                dealership_id=dealership.id,
                supplier_id=supplier.id,
                number=f"PO-2026-{500 + i}",
                status=status,
                created_at=_dt(rng.randint(0, 30)),
            )
            db.add(po)
            db.flush()
            total = 0
            for _ in range(rng.randint(1, 5)):
                inv = rng.choice(inventory)
                qty = rng.randint(5, 80)
                db.add(
                    PurchaseOrderItem(
                        purchase_order_id=po.id,
                        inventory_item_id=inv.id,
                        description=inv.name,
                        quantity=qty,
                        unit_cost_minor=inv.unit_cost_minor,
                    )
                )
                total += inv.unit_cost_minor * qty
            po.total_amount_minor = total
        db.flush()

        # --- Invoices (+ payments, varied statuses incl overdue/unpaid) ---
        inv_statuses = list(InvoiceStatus)
        invoices: list[Invoice] = []
        for i in range(40):
            c = rng.choice(customers)
            subtotal = rng.randint(2_000, 90_000) * 100
            gst = round(subtotal * 0.18)
            total = subtotal + gst
            status = rng.choice(inv_statuses)
            issued_days = rng.randint(0, 60)
            inv = Invoice(
                dealership_id=dealership.id,
                customer_id=c.id,
                number=f"INV-2026-{8000 + i}",
                status=status,
                subtotal_minor=subtotal,
                tax_minor=gst,
                total_minor=total,
                external_ref=(f"SAP-{rng.randint(100000,999999)}" if rng.random() < 0.8 else None),
                created_at=_dt(issued_days),
            )
            db.add(inv)
            db.flush()
            invoices.append(inv)
            if status == InvoiceStatus.paid:
                paid = total
            elif status == InvoiceStatus.partially_paid:
                paid = round(total * rng.uniform(0.2, 0.7))
            else:
                paid = 0
            if paid > 0:
                db.add(
                    Payment(
                        invoice_id=inv.id,
                        method=rng.choice(list(PaymentMethod)),
                        amount_minor=paid,
                        reference=f"PAY-{rng.randint(10000,99999)}",
                        note=("unreconciled" if rng.random() < 0.15 else "reconciled"),
                        created_at=_dt(rng.randint(0, issued_days) if issued_days else 0),
                    )
                )
        db.flush()

        # --- Agents ---
        agent_specs = [
            ("aria", "Aria", "Service & Customer Lifecycle",
             "Watches vehicle health and customer signals to orchestrate proactive service journeys.",
             "Proactive Brake Service · MH01 CJ 4821",
             "Triggered estimate for predicted brake wear (confidence 0.91)."),
            ("vault", "Vault", "Inventory & Procurement",
             "Keeps parts availability optimal — forecasts demand and raises purchase orders.",
             "Auto-Reorder · Brake Pad Set (BRA-1002)",
             "Raised PO draft for 3 below-safety-stock SKUs."),
            ("cipher", "Cipher", "Finance & Reconciliation",
             "Reconciles payments, syncs ERP and flags revenue leakage and GST anomalies.",
             "Daily Reconciliation · 38 invoices",
             "Matched 34/38 payments; flagged 2 mismatches for review."),
        ]
        for i, (key, name, domain, desc, cur_wf, last_dec) in enumerate(agent_specs):
            db.add(
                Agent(
                    dealership_id=dealership.id,
                    key=key,
                    name=name,
                    domain=domain,
                    description=desc,
                    status="active" if i != 2 else "degraded",
                    autonomous=(i != 2),
                    confidence_pct=rng.randint(82, 96),
                    health_pct=rng.randint(92, 100),
                    running_tasks=rng.randint(1, 6),
                    queued_decisions=rng.randint(0, 5),
                    current_workflow=cur_wf,
                    last_decision=last_dec,
                    last_action_at=_dt(rng.uniform(0.001, 0.05)),
                    cpu_pct=rng.randint(12, 64),
                    memory_pct=rng.randint(28, 72),
                    actions_today=rng.randint(18, 140),
                    success_rate_pct=rng.randint(94, 100),
                    created_at=_dt(300 - i * 5),
                )
            )

        decision_templates = {
            "aria": [
                "Detected 22% brake pad life on {veh}; generated service estimate.",
                "Customer due for periodic service; drafted WhatsApp reminder.",
                "Predicted battery failure within 14 days on {veh}; suggested replacement.",
            ],
            "vault": [
                "Brake Pad Set below safety stock; raised PO draft for 60 units.",
                "Forecasted 18% demand spike for Air Filters next month.",
                "Flagged Radiator as dead stock (0 movement in 90 days).",
            ],
            "cipher": [
                "Reconciled 34 payments against issued invoices.",
                "Flagged GST mismatch on INV-2026-8021 for finance review.",
                "Synced 12 paid invoices to SAP ERP successfully.",
            ],
        }
        from app.db.models.enums import AgentExecutionStatus

        for key, name, domain, *_ in agent_specs:
            for _ in range(7):
                veh = rng.choice(vehicles)
                summary = rng.choice(decision_templates[key]).replace("{veh}", f"{veh.make} {veh.model}")
                outcome = _weighted([("executed", 5), ("suggested", 3), ("awaiting_approval", 2), ("rejected", 1)])
                st = {
                    "executed": AgentExecutionStatus.triggered,
                    "suggested": AgentExecutionStatus.evaluated,
                    "rejected": AgentExecutionStatus.skipped,
                    "awaiting_approval": AgentExecutionStatus.evaluated,
                }[outcome]
                db.add(
                    AgentExecution(
                        dealership_id=dealership.id,
                        agent_key=key,
                        domain=domain,
                        status=st,
                        decision_should_execute=(outcome == "executed"),
                        workflow_key=rng.choice(["proactive_service", "auto_reorder", "daily_reconciliation"]),
                        confidence=rng.randint(70, 98),
                        rationale="Decision derived from rules over telematics + inventory signals.",
                        context={"summary": summary, "outcome": outcome, "entityLabel": f"{veh.make} {veh.model}"},
                        created_at=_dt(rng.uniform(0, 6)),
                    )
                )
            for _ in range(6):
                db.add(
                    AgentAction(
                        dealership_id=dealership.id,
                        agent_key=key,
                        description=rng.choice(decision_templates[key]).replace("{veh}", "vehicle"),
                        status=_weighted([("success", 7), ("pending", 2), ("failed", 1)]),
                        module=domain,
                        created_at=_dt(rng.uniform(0, 2)),
                    )
                )
        db.flush()

        # --- Audit logs (activity) ---
        wos = db.scalars(__import__("sqlalchemy").select(WorkOrder)).all()
        pos = db.scalars(__import__("sqlalchemy").select(PurchaseOrder)).all()
        user_list = db.scalars(__import__("sqlalchemy").select(User)).all()
        for _ in range(25):
            user = rng.choice(user_list)
            choice = rng.choice([
                ("created work order", rng.choice(wos).number, "Workshop"),
                ("approved purchase order", rng.choice(pos).number, "Procurement"),
                ("issued invoice", rng.choice(invoices).number, "Finance"),
                ("completed service for", rng.choice(vehicles).registration_no, "Workshop"),
                ("added customer", rng.choice(customers).full_name, "Customers"),
                ("reordered", rng.choice(inventory).name, "Inventory"),
            ])
            db.add(
                AuditLog(
                    dealership_id=dealership.id,
                    actor=user.full_name,
                    action=choice[0],
                    entity_type=choice[2],
                    entity_id=choice[1],
                    data={"target": choice[1], "module": choice[2]},
                    created_at=_dt(rng.uniform(0, 5)),
                )
            )
        db.flush()

        # --- Notifications (varied severity, some unread) ---
        notif_specs = [
            ("Critical stock: Brake Pad Set", "BRA-1002 is below safety stock. Vault drafted a purchase order.", "critical", "Inventory"),
            ("Approval required", "Aria is waiting for approval on a ₹14,500 brake service estimate.", "warning", "AI Center"),
            ("Invoice overdue", "INV-2026-8014 crossed its due date. Cipher flagged it for follow-up.", "warning", "Finance"),
            ("Service completed", "Bay 3 finished periodic service on MH12 AB 2931.", "success", "Workshop"),
            ("ERP sync complete", "12 paid invoices synced to SAP successfully.", "success", "Finance"),
            ("New 5-star feedback", "A customer rated their service experience 5 stars.", "info", "Customers"),
            ("Supplier delay", "Apollo Tyres flagged a 2-day delay on PO-2026-507.", "warning", "Procurement"),
        ]
        for i, (title, body, sev, module) in enumerate(notif_specs):
            db.add(
                Notification(
                    dealership_id=dealership.id,
                    title=title,
                    body=body,
                    severity=sev,
                    module=module,
                    is_read=(i > 3),
                    subject=title,
                    created_at=_dt(rng.uniform(0, 2)),
                )
            )
        db.commit()

        # --- Workflow executions via the engine ---
        _seed_workflows(db, dealership.id, vehicles)

        logger.info("Seed complete. Login: owner@apexmotors.in / password")
        print("Seed complete. Login: owner@apexmotors.in / password")
    finally:
        db.close()


def _seed_workflows(db: Session, dealership_id: str, vehicles: list[Vehicle]) -> None:
    """Start a few proactive_service workflows: one waiting_approval, one with a
    failed step (for retry-queue), plus a couple of running/completed."""
    engine = WorkflowEngine(db)

    def _ctx(v: Vehicle, on_hand: int, brake: int = 18) -> dict:
        return {
            "vehicle_id": v.id,
            "customer_id": v.customer_id,
            "customer_phone": "+910000000000",
            "brake_life_pct": brake,
            "_mock_on_hand": on_hand,
            "title": f"Proactive Service · {v.make} {v.model} ({v.registration_no})",
            "vehicle_label": f"{v.make} {v.model} ({v.registration_no})",
            "entity_type": "vehicle",
        }

    # 1. Waiting at approval gate (parts not in stock forces PO path later).
    v0, v1, v2 = vehicles[0], vehicles[1], vehicles[2]
    engine.start("proactive_service", _ctx(v0, on_hand=0), dealership_id=dealership_id)

    # 2. Approve one through and then force a step failure for the retry-queue.
    exec2 = engine.start("proactive_service", _ctx(v1, on_hand=5), dealership_id=dealership_id)
    engine.approve(exec2.id, approved_by="seed")
    # Force a failed step so /retry-queue is non-empty + execution -> failed.
    from app.db.models.enums import WorkflowStatus as WfStatus
    from app.db.models.workflow import WorkflowStep

    db.refresh(exec2)
    target = db.scalar(
        __import__("sqlalchemy").select(WorkflowStep)
        .where(WorkflowStep.execution_id == exec2.id, WorkflowStep.key == "erp_sync")
    )
    if target is not None:
        target.status = StepStatus.failed
        target.error = "SAP adapter timeout (504)"
        target.attempts = max(1, target.attempts)
        target.started_at = target.started_at or utcnow()
        exec2.status = WfStatus.failed
        exec2.error = "erp_sync: SAP adapter timeout (504)"

    # 3. Another awaiting approval (guarantee approvals list has entries).
    engine.start("proactive_service", _ctx(v2, on_hand=0), dealership_id=dealership_id)

    db.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed()
