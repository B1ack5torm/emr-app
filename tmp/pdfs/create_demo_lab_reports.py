from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUTPUT = Path(__file__).resolve().parents[2] / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

STYLES = getSampleStyleSheet()
TITLE = ParagraphStyle("ReportTitle", parent=STYLES["Title"], fontName="Helvetica-Bold", fontSize=20, leading=25, textColor=colors.HexColor("#163D33"), spaceAfter=4)
SUBTITLE = ParagraphStyle("ReportSubtitle", parent=STYLES["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=colors.HexColor("#2E7460"), alignment=TA_CENTER, spaceAfter=14)
SECTION = ParagraphStyle("Section", parent=STYLES["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#163D33"), spaceBefore=12, spaceAfter=6)
BODY = ParagraphStyle("Body", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=9, leading=13, textColor=colors.HexColor("#324A43"))
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8, leading=11, textColor=colors.HexColor("#60776E"))


def header_and_patient(story, report_name, report_id):
    story.extend([
        Paragraph("NEW LIFE HOSPITAL", TITLE),
        Paragraph("SAMPLE DIAGNOSTIC REPORT - FOR WORKFLOW TESTING ONLY", SUBTITLE),
        Paragraph(report_name, SECTION),
    ])
    patient = [
        ["Patient", "Ananya Mehta", "Report ID", report_id],
        ["MRN", "MRN-000001", "Date of birth", "14 May 1998"],
        ["Requested by", "Dr. Maya Shah", "Collected", "29 Aug 2026, 10:15 AM"],
    ]
    table = Table(patient, colWidths=[28 * mm, 58 * mm, 30 * mm, 55 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F7F4")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#5B766C")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#5B766C")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D7E3DD")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [table, Spacer(1, 6 * mm)]


def result_table(rows):
    table = Table(rows, colWidths=[82 * mm, 32 * mm, 31 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#256F5D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAF8")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D7E3DD")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def build_cbc():
    report = OUTPUT / "complete-blood-count-sample-report.pdf"
    story = []
    header_and_patient(story, "Complete blood count", "CBC-DEMO-20260829-001")
    story.append(result_table([
        ["Test", "Result", "Unit", "Reference range"],
        ["Hemoglobin", "13.2", "g/dL", "12.0 - 15.5"],
        ["White blood cell count", "6.8", "x10^9/L", "4.0 - 11.0"],
        ["Platelet count", "250", "x10^9/L", "150 - 450"],
        ["Red blood cell count", "4.45", "x10^12/L", "3.80 - 5.20"],
        ["Hematocrit", "39", "%", "36 - 46"],
    ]))
    story += [Spacer(1, 6 * mm), Paragraph("Interpretation", SECTION), Paragraph("Sample values are within the displayed reference ranges. This report contains fictional data for testing the EMR workflow only.", BODY)]
    build_document(report, story)


def build_influenza():
    report = OUTPUT / "rapid-influenza-test-sample-report.pdf"
    story = []
    header_and_patient(story, "Rapid influenza test", "FLU-DEMO-20260829-001")
    story.append(result_table([
        ["Analyte", "Result", "Method", "Reference"],
        ["Influenza A antigen", "Negative", "Rapid antigen assay", "Negative"],
        ["Influenza B antigen", "Negative", "Rapid antigen assay", "Negative"],
    ]))
    story += [Spacer(1, 6 * mm), Paragraph("Specimen", SECTION), Paragraph("Nasal swab. Sample received in suitable condition.", BODY), Paragraph("Interpretation", SECTION), Paragraph("No influenza A or B antigen detected in this fictional sample. Results are for workflow testing only and must not be used for clinical care.", BODY)]
    build_document(report, story)


def build_document(path, story):
    document = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm, title=path.stem)
    document.build(story, onFirstPage=footer, onLaterPages=footer)


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D7E3DD"))
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#60776E"))
    canvas.drawString(18 * mm, 10 * mm, "New Life Hospital - Sample report generated for EMR workflow testing")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {document.page}")
    canvas.restoreState()


if __name__ == "__main__":
    build_cbc()
    build_influenza()
