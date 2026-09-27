import asyncio
import uuid
import httpx
from src.main import app

async def run_e2e_tests():
    print("============================================================")
    print("V19PLUS — BACKEND LOCAL END-TO-END VERIFICATION SUITE")
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
        # 1. Root Endpoint
        res = await client.get("/")
        assert_test("Root Gateway Status", res.status_code == 200, f"({res.json().get('status')})")

        # 2. Health Check (Probing PostgreSQL & Redis)
        res = await client.get("/api/health")
        data = res.json()
        assert_test("System Health Check", res.status_code == 200, f"(Status: {data.get('status')}, DB: {data.get('database')}, Redis: {data.get('redis')})")

        # 3. Check Email Pre-Validation
        test_email = f"viewer_{uuid.uuid4().hex[:6]}@example.com"
        res = await client.post("/api/auth/check-email", json={"email": test_email})
        assert_test("Check Email Pre-Validation", res.status_code == 200 and res.json().get("exists") is False)

        # 4. User Registration (Signup)
        signup_payload = {
            "email": test_email,
            "password": "SecurePassword123!",
            "name": "E2E Test Viewer",
        }
        res = await client.post("/api/auth/signup", json=signup_payload)
        user_data = res.json()
        assert_test("User Registration (Signup)", res.status_code == 201, f"(User ID: {user_data.get('id')})")

        # 5. User Login (Access & Refresh Token Issuance)
        login_payload = {
            "email": test_email,
            "password": "SecurePassword123!",
            "device_id": "e2e_device_test",
        }
        res = await client.post("/api/auth/login", json=login_payload)
        tokens = res.json()
        assert_test("User Authentication (Login)", res.status_code == 200 and "access_token" in tokens)
        user_access_token = tokens["access_token"]
        user_refresh_token = tokens["refresh_token"]

        # 6. Authenticated /me Profile Query
        headers = {"Authorization": f"Bearer {user_access_token}"}
        res = await client.get("/api/auth/me", headers=headers)
        assert_test("Authenticated /me Profile Query", res.status_code == 200 and res.json().get("email") == test_email)

        # 7. Refresh Token Rotation
        res = await client.post("/api/auth/refresh", json={"refresh_token": user_refresh_token, "device_id": "e2e_device_test"})
        new_tokens = res.json()
        assert_test("Refresh Token Rotation", res.status_code == 200 and "access_token" in new_tokens)
        user_access_token = new_tokens["access_token"]
        headers = {"Authorization": f"Bearer {user_access_token}"}

        # 8. Subscription Plans Catalog (Seeded Plans)
        res = await client.get("/api/subscription/plans")
        plans = res.json()
        assert_test("Subscription Plans Discovery", res.status_code == 200 and len(plans) >= 4, f"({len(plans)} plans available)")
        mobile_plan = next((p for p in plans if p["slug"] == "mobile"), None)
        assert_test("Mobile Plan Configuration", mobile_plan is not None and mobile_plan["price_inr_paise"] == 14900)

        # 9. Admin Authentication
        admin_login = {
            "email": "admin@v19plus.com",
            "password": "Admin@V19plus2026",
            "device_id": "admin_studio_console",
        }
        res = await client.post("/api/auth/login", json=admin_login)
        assert_test("Admin Authentication", res.status_code == 200)
        admin_tokens = res.json()
        admin_headers = {"Authorization": f"Bearer {admin_tokens['access_token']}"}

        # 10. Large File Multipart Upload Initiation (25 GB File)
        file_25gb_bytes = 25 * 1024 * 1024 * 1024 # 26,843,545,600 bytes
        initiate_payload = {
            "filename": "Kalki_Master_ProRes_4K.mov",
            "file_size_bytes": file_25gb_bytes,
            "content_type": "video/quicktime",
        }
        res = await client.post("/api/media/upload/initiate", json=initiate_payload, headers=admin_headers)
        assert_test("25GB Master Upload Initiation", res.status_code == 200)
        upload_data = res.json()
        assert_test("Multipart Chunking Math (64MB chunks)", upload_data["total_parts"] == 400, f"(Total Parts: {upload_data['total_parts']}, UploadId: {upload_data['upload_id'][:12]}...)")

        # 11. Presigned Part URL Query on Demand
        part_res = await client.get(
            "/api/media/upload/part-url",
            params={"upload_id": upload_data["upload_id"], "key": upload_data["key"], "part_number": 42},
            headers=admin_headers,
        )
        assert_test("Presigned Part URL Generation (Part 42)", part_res.status_code == 200 and "url" in part_res.json())

        # 12. Create Content Entry (Admin CMS)
        content_payload = {
            "title": "V19 Original: The Great Himalayan Journey",
            "description": "An epic cinematic documentary across the high Himalayas.",
            "content_type": "DOCUMENTARY",
            "release_year": 2026,
            "rating": "U/A 13+",
            "duration_seconds": 7200,
            "is_original": True,
            "is_featured": True,
        }
        res = await client.post("/api/content", json=content_payload, headers=admin_headers)
        assert_test("Admin Content Creation", res.status_code == 201)
        created_content = res.json()
        content_slug = created_content["slug"]

        # 13. Public Discovery of Created Content
        res = await client.get("/api/content")
        assert_test("Content Catalog Query", res.status_code == 200)

        # 14. Slug-based Lookup (/api/content/:slug)
        res = await client.get(f"/api/content/{content_slug}")
        assert_test("Slug Content Lookup (/api/content/{slug})", res.status_code == 200 and res.json()["title"] == content_payload["title"])

        # 15. User Watchlist Toggle
        content_id = created_content["id"]
        res = await client.post(f"/api/streaming/watchlist/{content_id}", headers=headers)
        assert_test("User Watchlist Add", res.status_code == 200 and res.json()["in_watchlist"] is True)

        res = await client.post(f"/api/streaming/watchlist/{content_id}", headers=headers)
        assert_test("User Watchlist Toggle Remove", res.status_code == 200 and res.json()["in_watchlist"] is False)

        # 16. Watch Progress Tracking
        progress_payload = {
            "content_id": content_id,
            "progress_seconds": 1240,
            "duration_seconds": 7200,
        }
        res = await client.post("/api/streaming/progress", json=progress_payload, headers=headers)
        assert_test("Watch Progress Flush", res.status_code == 204)

        # 17. Continue Watching Shelf
        res = await client.get("/api/streaming/continue-watching", headers=headers)
        history_items = res.json()
        assert_test("Continue Watching Shelf Discovery", res.status_code == 200 and len(history_items) >= 1 and history_items[0]["progress_seconds"] == 1240)

        # 18. Non-Admin Security Restriction (RBAC check)
        blocked_res = await client.post("/api/content", json=content_payload, headers=headers)
        assert_test("RBAC Security Enforcement (Non-admin blocked)", blocked_res.status_code == 403)

    print("============================================================")
    print(f"🎉 ALL {passed_count}/{total_count} E2E INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
