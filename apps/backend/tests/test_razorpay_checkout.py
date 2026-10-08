import asyncio
import hashlib
import hmac
import uuid
import httpx
from src.main import app
from src.config import settings

async def run_razorpay_tests():
    print("============================================================")
    print("V19PLUS — RAZORPAY STANDARD WEB CHECKOUT VERIFICATION SUITE")
    print("============================================================")

    passed = 0
    total = 0

    def assert_check(name: str, condition: bool, extra: str = ""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name} {extra}")
        else:
            print(f"  [FAIL] {name} {extra}")
            raise AssertionError(f"Test failed: {name} {extra}")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Environment & Credentials Configuration
        assert_check("Razorpay Key ID Configured", settings.RAZORPAY_KEY_ID == "rzp_live_Tbb4iLspKtfxWT", f"({settings.RAZORPAY_KEY_ID})")
        assert_check("Razorpay Key Secret Configured", settings.RAZORPAY_KEY_SECRET == "ZXTUeRfIiuZwNG3MoJP26iCH")

        # 2. Step 1: Create Order - Minimum Amount Validation (< 100 paise)
        invalid_amount_res = await client.post("/api/create-order", json={"amount": 50, "currency": "INR"})
        assert_check("Reject Order < 100 paise (Amount Validation)", invalid_amount_res.status_code == 400)
        assert_check("Validation Message Present", "100 paise" in invalid_amount_res.json().get("detail", ""))

        # 3. Step 1: Create Order - Valid Amount (e.g. ₹299 = 29900 paise)
        order_payload = {
            "amount": 29900,
            "currency": "INR",
            "receipt": f"rcpt_std_{uuid.uuid4().hex[:8]}",
            "notes": {"flow": "standard_web_checkout", "item": "event_ticket"},
        }
        res_create = await client.post("/api/create-order", json=order_payload)
        assert_check("Create Order HTTP 200", res_create.status_code == 200)
        order_data = res_create.json()
        assert_check("Order ID Returned", bool(order_data.get("order_id")) and order_data["order_id"].startswith("order_"), f"({order_data.get('order_id')})")
        assert_check("Amount Matches Request", order_data.get("amount") == 29900)
        assert_check("Currency is INR", order_data.get("currency") == "INR")
        assert_check("Key ID Matches Configured Gateway", order_data.get("key_id") == "rzp_live_Tbb4iLspKtfxWT")
        order_id = order_data["order_id"]

        # Also verify the alias route /api/payments/create-order
        alias_res = await client.post("/api/payments/create-order", json={"amount": 50000, "currency": "INR"})
        assert_check("Create Order Alias Route (/api/payments/create-order)", alias_res.status_code == 200 and alias_res.json()["amount"] == 50000)

        # 4. Step 3: Verify Payment - Valid HMAC-SHA256 Signature
        payment_id = f"pay_{uuid.uuid4().hex[:12]}"
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        secret = settings.RAZORPAY_KEY_SECRET.encode("utf-8")
        valid_signature = hmac.new(secret, msg, hashlib.sha256).hexdigest()

        verify_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_signature,
        }
        res_verify = await client.post("/api/verify-payment", json=verify_payload)
        assert_check("Verify Payment Signature HTTP 200", res_verify.status_code == 200)
        verify_data = res_verify.json()
        assert_check("Verification Status is Success", verify_data.get("status") == "success")
        assert_check("Payment ID Echoed in Verification", verify_data.get("payment_id") == payment_id)

        # 5. Step 3: Verify Payment - Invalid / Tampered Signature (Must Return 400)
        tampered_sig = valid_signature[:-4] + "dead"
        tamper_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": tampered_sig,
        }
        res_tamper = await client.post("/api/verify-payment", json=tamper_payload)
        assert_check("Reject Tampered Signature HTTP 400", res_tamper.status_code == 400)
        assert_check("Signature Mismatch Message in Detail", "Signature mismatch" in res_tamper.json().get("detail", ""))

        # 6. Step 3: Verify Payment - Missing Required Fields
        missing_payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "",
            "razorpay_signature": valid_signature,
        }
        res_missing = await client.post("/api/verify-payment", json=missing_payload)
        assert_check("Reject Missing Fields HTTP 400 or 422", res_missing.status_code in (400, 422))

    print("============================================================")
    print(f"🎉 ALL {passed}/{total} RAZORPAY STANDARD CHECKOUT TESTS PASSED!")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_razorpay_tests())
