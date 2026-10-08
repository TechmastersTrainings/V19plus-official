import asyncio
import hmac
import hashlib
import uuid
import httpx
from src.main import app
from src.config import settings

async def run_event_ticketing_e2e_tests():
    print("============================================================")
    print("V19PLUS — EVENT TICKETING END-TO-END VERIFICATION SUITE")
    print("============================================================")

    passed_count = 0
    total_count = 0

    def assert_test(name: str, condition: bool, extra: str = ""):
        nonlocal passed_count, total_count
        total_count += 1
        if condition:
            passed_count += 1
            print(f"  [PASS] {name} {extra}")
        else:
            print(f"  [FAIL] {name} {extra}")
            raise AssertionError(f"Test failed: {name} {extra}")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Public Events Catalog Discovery
        res = await client.get("/api/events")
        assert_test("Public Events Listing", res.status_code == 200)
        events = res.json()
        assert_test("Events Found in Catalog", len(events) >= 1, f"({len(events)} events found)")

        # Find ZINGAT VOL-7 Dandiya Festival 2K26
        zingat = next((e for e in events if "zingat" in e["slug"]), None)
        assert_test("ZINGAT VOL-7 Found in Catalog", zingat is not None, f"Slug: {zingat['slug'] if zingat else 'None'}")
        event_id = zingat["id"]
        event_slug = zingat["slug"]

        # 2. Detailed Event Slug Lookup
        res = await client.get(f"/api/events/{event_slug}")
        assert_test("Event Slug Lookup (/api/events/{slug})", res.status_code == 200)
        event_detail = res.json()
        assert_test("Event Title Verification", "ZINGAT VOL-7" in event_detail["title"])
        assert_test("Event Venue Verification", "Tagare Layout" in event_detail["venue_address"] or "Bidar" in event_detail["city"])
        assert_test("Ticket Types Available", len(event_detail["ticket_types"]) >= 1)

        ticket_type = event_detail["ticket_types"][0]
        ticket_type_id = ticket_type["id"]
        assert_test("Ticket Price Verification (₹299 = 29900 paise)", ticket_type["price_paise"] == 29900)

        # 3. User Authentication for Booking
        test_email = f"attendee_{uuid.uuid4().hex[:6]}@example.com"
        res = await client.post("/api/auth/signup", json={
            "email": test_email,
            "password": "TicketPassword123!",
            "name": "Pooja Patil",
        })
        assert_test("Attendee User Registration", res.status_code == 201)

        res = await client.post("/api/auth/login", json={
            "email": test_email,
            "password": "TicketPassword123!",
            "device_id": "phone_browser_01",
        })
        assert_test("Attendee User Login", res.status_code == 200)
        user_tokens = res.json()
        user_headers = {"Authorization": f"Bearer {user_tokens['access_token']}"}

        # 4. Create Booking Order (2 Tickets for Dandiya)
        attendees = [
            {"name": "Pooja Patil", "phone": "9876543210"},
            {"name": "Sneha Kulkarni", "phone": "9876543211"}
        ]
        order_payload = {
            "event_id": event_id,
            "ticket_type_id": ticket_type_id,
            "quantity": 2,
            "customer_name": "Pooja Patil",
            "customer_email": test_email,
            "customer_phone": "9876543210",
            "attendees": attendees,
        }
        res = await client.post("/api/events/bookings/create-order", json=order_payload, headers=user_headers)
        assert_test("Create Booking Order (2 Tickets)", res.status_code in (200, 201))
        order_data = res.json()
        booking_id = order_data["booking_id"]
        order_id = order_data["order_id"]
        total_amount = order_data["amount_paise"]
        assert_test("Order Total Amount (2 x ₹299 = ₹598 / 59800 paise)", total_amount == 59800)
        assert_test("Razorpay Order ID Generated", bool(order_id))

        # 5. Payment Verification with Cryptographic HMAC Signature
        payment_id = f"pay_{uuid.uuid4().hex[:12]}"
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        secret = settings.RAZORPAY_KEY_SECRET.encode("utf-8")
        signature = hmac.new(secret, msg, hashlib.sha256).hexdigest()

        verify_payload = {
            "booking_id": booking_id,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        }
        res = await client.post("/api/events/bookings/verify-payment", json=verify_payload, headers=user_headers)
        assert_test("Payment Verification (HMAC-SHA256)", res.status_code == 200)
        confirmed_booking = res.json()
        assert_test("Booking Status CONFIRMED", confirmed_booking["status"] == "CONFIRMED")
        assert_test("Issued 2 Tickets", len(confirmed_booking["tickets"]) == 2)

        ticket_1 = confirmed_booking["tickets"][0]
        ticket_2 = confirmed_booking["tickets"][1]
        assert_test("Ticket 1 Number Generated", ticket_1["ticket_number"].startswith("TKT-"))
        assert_test("Ticket 1 QR Token Generated", bool(ticket_1["qr_token"]))
        assert_test("Ticket 2 Number Generated", ticket_2["ticket_number"].startswith("TKT-"))
        assert_test("Ticket 2 QR Token Generated", bool(ticket_2["qr_token"]))

        # 6. Idempotent Payment Verification
        res_repeat = await client.post("/api/events/bookings/verify-payment", json=verify_payload, headers=user_headers)
        assert_test("Idempotent Payment Callback (Duplicate call)", res_repeat.status_code == 200)
        repeat_booking = res_repeat.json()
        assert_test("Idempotent Ticket Count Unchanged", len(repeat_booking["tickets"]) == 2)
        assert_test("Idempotent Ticket IDs Match", repeat_booking["tickets"][0]["id"] == ticket_1["id"])

        # 7. User "My Tickets" Discovery
        res = await client.get("/api/events/user/my-tickets", headers=user_headers)
        assert_test("User My Tickets Query", res.status_code == 200)
        my_bookings = res.json()
        assert_test("User Can See Their Passes", any(t["id"] == ticket_1["id"] for b in my_bookings for t in b["tickets"]))

        # 8. Vector PDF Ticket Generation & Download
        res = await client.get(f"/api/events/tickets/{ticket_1['id']}/pdf", headers=user_headers)
        assert_test("PDF Pass Download HTTP Status", res.status_code == 200)
        assert_test("PDF Content-Type Header", res.headers.get("content-type") == "application/pdf")
        assert_test("PDF Magic Header Valid (%PDF-)", res.content.startswith(b"%PDF-"), f"(Size: {len(res.content)} bytes)")

        # 9. Admin Authentication
        admin_login = {
            "email": "support@techmastersinnovations.in",
            "password": "Fri10Feb@2023",
            "device_id": "gate_scanner_tablet_01",
        }
        res = await client.post("/api/auth/login", json=admin_login)
        assert_test("Admin Gate Login", res.status_code == 200)
        admin_tokens = res.json()
        admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

        # 10. Admin Check-In Scanner — First Scan (Ticket 1)
        scan_payload = {
            "qr_token": ticket_1["qr_token"],
            "device_info": "Gate-A-Scanner",
        }
        res = await client.post("/api/admin/events/check-in", json=scan_payload, headers=admin_headers)
        assert_test("Admin Gate Check-in Scan", res.status_code == 200)
        scan_res = res.json()
        assert_test("Ticket 1 Check-In Successful", scan_res["success"] is True)
        assert_test("Ticket 1 Result Code CHECK_IN_SUCCESS", scan_res["result_code"] == "CHECK_IN_SUCCESS")
        assert_test("Attendee Name Matched", scan_res["attendee_name"] == "Pooja Patil")

        # 11. Anti-Duplicate Rejection — Second Scan of Ticket 1
        res = await client.post("/api/admin/events/check-in", json=scan_payload, headers=admin_headers)
        assert_test("Admin Duplicate Scan HTTP Status", res.status_code == 200)
        dup_res = res.json()
        assert_test("Duplicate Scan Rejected (success == False)", dup_res["success"] is False)
        assert_test("Duplicate Rejection Code ALREADY_CHECKED_IN", dup_res["result_code"] == "ALREADY_CHECKED_IN")
        assert_test("Checked-In Timestamp Present in Duplicate Alert", bool(dup_res.get("already_checked_in_at")))

        # 12. Check-In Ticket 2
        scan_payload_2 = {
            "qr_token": ticket_2["qr_token"],
            "device_info": "Gate-A-Scanner",
        }
        res = await client.post("/api/admin/events/check-in", json=scan_payload_2, headers=admin_headers)
        scan_res_2 = res.json()
        assert_test("Ticket 2 Check-In Successful", scan_res_2["success"] is True and scan_res_2["result_code"] == "CHECK_IN_SUCCESS")

        # 13. Invalid / Tampered QR Token Rejection
        tampered_token = ticket_1["qr_token"][:-4] + "ffff"
        res = await client.post("/api/admin/events/check-in", json={"qr_token": tampered_token}, headers=admin_headers)
        tamper_res = res.json()
        assert_test("Tampered QR Token Rejection", tamper_res["success"] is False and tamper_res["result_code"] == "INVALID_TICKET")

        # 14. Admin Event Live Stats
        res = await client.get(f"/api/admin/events/{event_id}/stats", headers=admin_headers)
        assert_test("Admin Live Stats Query", res.status_code == 200)
        stats = res.json()
        assert_test("Stats Total Sold Tickets", stats["total_sold"] >= 2)
        assert_test("Stats Total Checked-In Count", stats["total_checked_in"] >= 2)
        assert_test("Stats Total Revenue Calculation", stats["total_revenue_paise"] >= 59800)

        # 15. Admin Bookings List
        res = await client.get(f"/api/admin/events/{event_id}/bookings", headers=admin_headers)
        assert_test("Admin Bookings Roster Query", res.status_code == 200)
        bookings_list = res.json()
        assert_test("Booking in Admin Roster", any(b["id"] == booking_id for b in bookings_list))

        # 16. Admin Attendee CSV Export
        res = await client.get(f"/api/admin/events/{event_id}/export-attendees.csv", headers=admin_headers)
        assert_test("Admin Attendee CSV Export HTTP Status", res.status_code == 200)
        assert_test("CSV Content-Type Header", "text/csv" in res.headers.get("content-type", ""))
        csv_text = res.text
        assert_test("CSV Contains Headers", "Ticket Number,Attendee Name,Phone,Status" in csv_text or "Ticket Number" in csv_text)
        assert_test("CSV Contains Attendee 1", "Pooja Patil" in csv_text)
        assert_test("CSV Contains Attendee 2", "Sneha Kulkarni" in csv_text)

        # 17. Admin Capacity Modification
        res = await client.patch(
            f"/api/admin/events/ticket-types/{ticket_type_id}/capacity",
            json={"total_capacity": 550},
            headers=admin_headers
        )
        assert_test("Admin Capacity Modification", res.status_code == 200 and res.json()["total_capacity"] == 550)

    print("============================================================")
    print(f"🎉 ALL {passed_count}/{total_count} EVENT TICKETING E2E TESTS PASSED!")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_event_ticketing_e2e_tests())
