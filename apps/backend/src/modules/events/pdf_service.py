import io
import qrcode
from datetime import datetime
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from src.modules.events.models import Event, EventBooking, EventTicket, TicketType


class TicketPDFService:
    @staticmethod
    def generate_ticket_pdf(
        ticket: EventTicket,
        booking: EventBooking,
        event: Event,
        ticket_type: TicketType,
    ) -> bytes:
        """
        Generate a crisp, production-grade PDF event pass with an embedded
        cryptographic QR code, security badges, attendee details, and terms.
        """
        buffer = io.BytesIO()

        # Canvas Dimensions: 640pt wide x 340pt high (standard digital pass card)
        width = 640
        height = 340
        c = canvas.Canvas(buffer, pagesize=(width, height))

        # Color Palette
        bg_dark = HexColor("#0A0A0A")
        card_bg = HexColor("#141414")
        card_border = HexColor("#2A2A2A")
        primary_red = HexColor("#E50914")
        accent_orange = HexColor("#FF5C00")
        text_white = HexColor("#FFFFFF")
        text_gray = HexColor("#A3A3A3")
        text_muted = HexColor("#737373")
        ticket_stub_bg = HexColor("#1B1B1B")

        # 1. Background fill
        c.setFillColor(bg_dark)
        c.rect(0, 0, width, height, fill=1, stroke=0)

        # 2. Outer Card with rounded corners
        c.setFillColor(card_bg)
        c.setStrokeColor(card_border)
        c.setLineWidth(1.5)
        c.roundRect(16, 16, width - 32, height - 32, radius=12, fill=1, stroke=1)

        # 3. Top Decorative Brand Bar
        c.setFillColor(accent_orange)
        c.roundRect(20, height - 26, width - 40, 6, radius=2, fill=1, stroke=0)

        # 4. Header branding
        c.setFillColor(text_white)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(32, height - 48, "V19PLUS")
        c.setFillColor(accent_orange)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(92, height - 48, "LIVE EVENTS")

        c.setFillColor(text_muted)
        c.setFont("Helvetica", 9)
        c.drawRightString(440, height - 48, "OFFICIAL DIGITAL ENTRY PASS")

        # 5. Restrictions Badge (e.g. ONLY FOR LADIES)
        if event.restrictions:
            badge_text = event.restrictions.upper()
            c.setFillColor(primary_red)
            c.roundRect(32, height - 76, 130, 20, radius=4, fill=1, stroke=0)
            c.setFillColor(text_white)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(32 + 65, height - 72, badge_text)

        # 6. Event Title
        c.setFillColor(text_white)
        c.setFont("Helvetica-Bold", 18)
        title_y = height - 105
        # Truncate or wrap title if too long
        title_text = event.title
        if len(title_text) > 36:
            c.drawString(32, title_y, title_text[:36])
            c.setFont("Helvetica-Bold", 14)
            c.drawString(32, title_y - 18, title_text[36:72])
            title_offset = 18
        else:
            c.drawString(32, title_y, title_text)
            title_offset = 0

        # 7. Date & Time
        info_start_y = title_y - title_offset - 24
        c.setFillColor(accent_orange)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(32, info_start_y, "DATE & TIME")

        c.setFillColor(text_white)
        c.setFont("Helvetica", 10)
        start_str = event.start_time.strftime("%A, %d %B %Y | %I:%M %p")
        end_str = event.end_time.strftime("%I:%M %p")
        c.drawString(32, info_start_y - 14, f"{start_str} - {end_str}")

        # 8. Venue
        c.setFillColor(accent_orange)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(32, info_start_y - 34, "VENUE")

        c.setFillColor(text_white)
        c.setFont("Helvetica", 9)
        c.drawString(32, info_start_y - 48, f"{event.venue_name}, {event.city}")
        c.setFillColor(text_gray)
        c.setFont("Helvetica", 8)
        # Handle multi-line venue address
        addr_text = event.venue_address
        if len(addr_text) > 55:
            c.drawString(32, info_start_y - 60, addr_text[:55])
            c.drawString(32, info_start_y - 70, addr_text[55:110])
            addr_offset = 10
        else:
            c.drawString(32, info_start_y - 60, addr_text)
            addr_offset = 0

        # 9. Attendee & Ticket Info Grid
        grid_y = info_start_y - 82 - addr_offset
        # Line divider
        c.setStrokeColor(HexColor("#222222"))
        c.setLineWidth(1)
        c.line(32, grid_y + 8, 440, grid_y + 8)

        # Col 1: Attendee Name
        c.setFillColor(text_muted)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(32, grid_y - 4, "ATTENDEE")
        c.setFillColor(text_white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(32, grid_y - 17, ticket.attendee_name[:24])

        # Col 2: Ticket Tier & Price
        c.setFillColor(text_muted)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(160, grid_y - 4, "TICKET TIER")
        c.setFillColor(accent_orange)
        c.setFont("Helvetica-Bold", 10)
        price_inr = ticket_type.price_paise / 100
        c.drawString(160, grid_y - 17, f"{ticket_type.name} (Rs. {int(price_inr)})")

        # Col 3: Booking Reference
        c.setFillColor(text_muted)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(310, grid_y - 4, "BOOKING REF")
        c.setFillColor(text_white)
        c.setFont("Helvetica", 10)
        c.drawString(310, grid_y - 17, booking.booking_reference)

        # Ticket Number at bottom
        c.setFillColor(text_muted)
        c.setFont("Helvetica", 8)
        c.drawString(32, 28, f"TICKET ID: {ticket.ticket_number}")
        c.drawRightString(440, 28, "VALID FOR 1 PERSON ENTRY ONLY")

        # ---------------------------------------------------------
        # RIGHT SIDE: QR Code & Stub
        # ---------------------------------------------------------
        divider_x = 460

        # Vertical perforated dividing line
        c.setStrokeColor(HexColor("#333333"))
        c.setDash(3, 4)
        c.setLineWidth(1.5)
        c.line(divider_x, 26, divider_x, height - 26)
        c.setDash()  # Reset dash

        # Semicircular punch-out notches at top and bottom of divider line
        c.setFillColor(bg_dark)
        c.setStrokeColor(card_border)
        c.setLineWidth(1)
        c.circle(divider_x, height - 16, 8, fill=1, stroke=1)
        c.circle(divider_x, 16, 8, fill=1, stroke=1)

        # Stub Background Box
        stub_start_x = divider_x + 12
        stub_width = width - stub_start_x - 24

        c.setFillColor(ticket_stub_bg)
        c.roundRect(stub_start_x, 26, stub_width, height - 52, radius=8, fill=1, stroke=0)

        # Generate QR Code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=1,
        )
        # The QR contains the verification token directly
        qr.add_data(ticket.qr_token)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")

        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        qr_reader = ImageReader(qr_buffer)

        # Draw QR code in stub
        qr_size = 118
        qr_x = stub_start_x + (stub_width - qr_size) / 2
        qr_y = height - 180
        c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)

        # Stub labels
        c.setFillColor(text_white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(stub_start_x + stub_width / 2, height - 48, "ENTRY PASS")

        c.setFillColor(accent_orange)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(stub_start_x + stub_width / 2, qr_y - 14, "SCAN AT GATE")

        c.setFillColor(text_muted)
        c.setFont("Helvetica", 7)
        c.drawCentredString(
            stub_start_x + stub_width / 2, qr_y - 28, "Security Verified Token"
        )
        c.drawCentredString(
            stub_start_x + stub_width / 2, qr_y - 38, f"#{ticket.ticket_number[-8:]}"
        )

        c.save()
        buffer.seek(0)
        return buffer.getvalue()
