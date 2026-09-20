import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../database/db';
import { Student, SchoolClass, Section, AttendanceRecord, CustomField } from '../types';
import { calculateStudentAttendanceStats, computeWorkingDays, getTodayDateString } from './attendanceService';

export interface GeneratePdfOptions {
  title: string;
  subtitle?: string;
  fileName: string;
  selectedFields?: string[];
  orientation?: 'portrait' | 'landscape' | 'auto';
  recordType: 'STUDENT_CARD' | 'CLASS_REGISTER' | 'ATTENDANCE_DAILY' | 'ATTENDANCE_MONTHLY' | 'ATTENDANCE_YEARLY' | 'SCHOOL_SUMMARY';
  targetInfo: string;
}

export class PdfService {
  private static addHeader(doc: jsPDF, orientation: 'portrait' | 'landscape', title: string, subtitle?: string) {
    const school = db.getSchoolSettings();
    const appSettings = db.getAppSettings();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Primary Header Background / Accent Bar
    doc.setFillColor(30, 58, 138); // Dark Navy Blue (#1e3a8a)
    doc.rect(0, 0, pageWidth, 28, 'F');

    // School Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(school.name.toUpperCase(), pageWidth / 2, 11, { align: 'center' });

    // School Code & Location
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(220, 235, 252);
    let metaText = school.address;
    if (appSettings.showSchoolCodeInPdf && school.code) {
      metaText = `SCHOOL CODE: ${school.code}  |  ${school.address}, ${school.district} (${school.state})`;
    }
    doc.text(metaText, pageWidth / 2, 18, { align: 'center' });

    // Report Title Box
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 32, pageWidth - 28, 15, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 32, pageWidth - 28, 15, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 20, 42);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle, pageWidth - 20, 42, { align: 'right' });
    }
  }

  private static addFooter(doc: jsPDF) {
    const appSettings = db.getAppSettings();
    const pageCount = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      // Line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

      let footerLeft = 'Official School Record • GHS Fatehpuria NK (Code: 3005)';
      if (appSettings.showGeneratedDateTimeInPdf) {
        footerLeft += ` • Generated: ${nowStr}`;
      }
      doc.text(footerLeft, 14, pageHeight - 7);

      if (appSettings.showPageNumbersInPdf) {
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
      }
    }
  }

  private static downloadOrShare(doc: jsPDF, fileName: string, options: GeneratePdfOptions, recordCount: number) {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const pdfBlob = doc.output('blob');

    // Trigger download
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save to local DB history
    db.addPdfHistory({
      fileName: cleanFileName,
      type: options.recordType,
      recordCount,
      targetInfo: options.targetInfo,
    });

    return { blob: pdfBlob, blobUrl, fileName: cleanFileName };
  }

  // 1. Export Student Register (Class, Section, or All School)
  public static exportStudentRegister(
    students: Student[],
    options: {
      title: string;
      subtitle?: string;
      fileName: string;
      selectedFieldKeys?: string[];
      classMap: Map<string, SchoolClass>;
      sectionMap: Map<string, Section>;
      targetInfo: string;
    }
  ) {
    const appSettings = db.getAppSettings();
    const customFields = db.getCustomFields();

    // Available columns definition
    const columnDefinitions: Record<string, { header: string; getValue: (s: Student) => string }> = {
      rollNo: { header: 'Roll No', getValue: s => String(s.rollNo) },
      name: { header: 'Student Name', getValue: s => s.name },
      classSection: {
        header: 'Class / Sec',
        getValue: s => {
          const cls = options.classMap.get(s.classId)?.name || '';
          const sec = options.sectionMap.get(s.sectionId)?.name || '';
          return `${cls} - ${sec}`;
        },
      },
      fatherName: { header: 'Father Name', getValue: s => s.fatherName },
      motherName: { header: 'Mother Name', getValue: s => s.motherName },
      dob: { header: 'DOB', getValue: s => s.dob || '-' },
      address: { header: 'Address', getValue: s => s.address || '-' },
      examRollNo: { header: 'Exam Roll', getValue: s => s.examRollNo || '-' },
      feesPending: { header: 'Fees (₹)', getValue: s => (s.feesPending > 0 ? `₹${s.feesPending}` : 'Nil') },
      attendancePercentage: {
        header: 'Att. %',
        getValue: s => {
          const stat = calculateStudentAttendanceStats(s);
          return `${stat.attendancePercentage}%`;
        },
      },
    };

    // Add custom fields to definitions
    customFields.forEach(cf => {
      columnDefinitions[`cf_${cf.id}`] = {
        header: cf.name,
        getValue: s => db.getCustomFieldValue(s.id, cf.id) || '-',
      };
    });

    const activeKeys =
      options.selectedFieldKeys && options.selectedFieldKeys.length > 0
        ? options.selectedFieldKeys
        : appSettings.defaultPdfFields;

    const headers: string[] = [];
    const keyOrder: string[] = [];

    activeKeys.forEach(k => {
      if (columnDefinitions[k]) {
        headers.push(columnDefinitions[k].header);
        keyOrder.push(k);
      }
    });

    // Auto orientation: if more than 6 columns, landscape
    const orientation: 'portrait' | 'landscape' =
      appSettings.pdfOrientation === 'auto'
        ? headers.length > 6
          ? 'landscape'
          : 'portrait'
        : appSettings.pdfOrientation;

    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    this.addHeader(doc, orientation, options.title, options.subtitle || `Total Students: ${students.length}`);

    const tableRows = students.map(s => keyOrder.map(k => columnDefinitions[k].getValue(s)));

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 52,
      styles: {
        fontSize: headers.length > 8 ? 7.5 : 8.5,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 52, bottom: 18, left: 14, right: 14 },
    });

    this.addFooter(doc);

    return this.downloadOrShare(
      doc,
      options.fileName,
      {
        title: options.title,
        subtitle: options.subtitle,
        fileName: options.fileName,
        recordType: 'CLASS_REGISTER',
        targetInfo: options.targetInfo,
      },
      students.length
    );
  }

  // 2. Export Single Student Information Sheet
  public static exportSingleStudent(student: Student, classObj?: SchoolClass, sectionObj?: Section) {
    const orientation = 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const stat = calculateStudentAttendanceStats(student);
    const applicableCustomFields = db.getApplicableCustomFieldsForStudent(student);

    this.addHeader(
      doc,
      orientation,
      'STUDENT CUM ATTENDANCE PROFILE',
      `Class: ${classObj?.name || ''} ${sectionObj?.name || ''}  |  Roll No: ${student.rollNo}`
    );

    // Profile Table
    const dataRows = [
      ['Student Full Name', student.name],
      ['Roll Number', String(student.rollNo)],
      ['Class & Section', `${classObj?.name || ''} - ${sectionObj?.name || ''}`],
      ["Father's Name", student.fatherName],
      ["Mother's Name", student.motherName],
      ['Date of Birth', student.dob || 'Not Provided'],
      ['Residential Address', student.address || 'Not Provided'],
      ['Exam Roll Number', student.examRollNo || 'N/A'],
      ['Fees Status', student.feesPending > 0 ? `Pending: ₹${student.feesPending}` : 'Fully Paid (₹0)'],
      ['Total Working Days', String(stat.workingDays)],
      ['Present Days', String(stat.presentDays)],
      ['Absent Days', String(stat.absentDays)],
      ['Leave Days', String(stat.leaveDays)],
      ['Overall Attendance %', `${stat.attendancePercentage}% (Sundays & Holidays Excluded)`],
    ];

    applicableCustomFields.forEach(cf => {
      const val = db.getCustomFieldValue(student.id, cf.id);
      if (val) {
        dataRows.push([cf.name, val]);
      }
    });

    autoTable(doc, {
      body: dataRows,
      startY: 52,
      styles: {
        fontSize: 9.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 70 },
        1: { cellWidth: 'auto' },
      },
      margin: { top: 52, bottom: 18, left: 14, right: 14 },
    });

    this.addFooter(doc);

    const fileName = `Student_${student.name.replace(/\s+/g, '_')}_Roll_${student.rollNo}.pdf`;
    return this.downloadOrShare(
      doc,
      fileName,
      {
        title: `Student Profile: ${student.name}`,
        fileName,
        recordType: 'STUDENT_CARD',
        targetInfo: `Roll ${student.rollNo} - ${student.name}`,
      },
      1
    );
  }

  // 3. Export Daily Attendance Sheet
  public static exportDailyAttendance(
    classObj: SchoolClass,
    sectionObj: Section,
    dateStr: string,
    records: AttendanceRecord[],
    students: Student[],
    teacherName?: string
  ) {
    const orientation = 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const isHoliday = db.isDateHoliday(dateStr);
    const isSunday = db.isDateSunday(dateStr);

    let statusNote = `Date: ${dateStr}  |  Teacher: ${teacherName || 'In-Charge'}`;
    if (isHoliday) statusNote += ` [Holiday: ${isHoliday.name}]`;
    if (isSunday) statusNote += ' [Sunday]';

    this.addHeader(
      doc,
      orientation,
      `DAILY ATTENDANCE SHEET: ${classObj.name} - ${sectionObj.name}`,
      statusNote
    );

    const recordMap = new Map<string, AttendanceRecord>();
    records.forEach(r => recordMap.set(r.studentId, r));

    let present = 0;
    let absent = 0;
    let leave = 0;

    const rows = students.map(s => {
      const rec = recordMap.get(s.id);
      let status = rec?.status || 'UNMARKED';
      if (status === 'PRESENT') present++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'LEAVE') leave++;

      return [
        String(s.rollNo),
        s.name,
        s.fatherName,
        status,
        rec?.remark || '-',
      ];
    });

    autoTable(doc, {
      head: [['Roll No', 'Student Name', 'Father Name', 'Attendance Status', 'Remark / Notes']],
      body: rows,
      startY: 52,
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw;
          if (val === 'PRESENT') {
            data.cell.styles.textColor = [22, 101, 52]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ABSENT') {
            data.cell.styles.textColor = [185, 28, 28]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'LEAVE') {
            data.cell.styles.textColor = [180, 83, 9]; // Amber
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { top: 52, bottom: 25, left: 14, right: 14 },
    });

    // Summary block at the bottom
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 12, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, finalY, doc.internal.pageSize.getWidth() - 28, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const summaryText = `TOTAL STUDENTS: ${students.length}    |    PRESENT: ${present}    |    ABSENT: ${absent}    |    LEAVE: ${leave}`;
    doc.text(summaryText, 20, finalY + 8);

    this.addFooter(doc);

    const fileName = `${classObj.name}_${sectionObj.name}_Attendance_${dateStr}.pdf`;
    return this.downloadOrShare(
      doc,
      fileName,
      {
        title: `Daily Attendance: ${classObj.name} ${sectionObj.name}`,
        fileName,
        recordType: 'ATTENDANCE_DAILY',
        targetInfo: `${classObj.name} ${sectionObj.name} on ${dateStr}`,
      },
      students.length
    );
  }

  // 4. Export Monthly Attendance Report
  public static exportMonthlyAttendance(
    classObj: SchoolClass,
    sectionObj: Section,
    year: number,
    month: number, // 1 - 12
    students: Student[]
  ) {
    const orientation = 'landscape';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const workingInfo = computeWorkingDays(startDate, endDate);
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' });

    this.addHeader(
      doc,
      orientation,
      `MONTHLY ATTENDANCE REGISTER: ${classObj.name} - ${sectionObj.name} (${monthName} ${year})`,
      `Working Days: ${workingInfo.totalWorkingDays}  |  Sundays: ${workingInfo.sundaysCount}  |  Holidays: ${workingInfo.holidaysCount}`
    );

    const rows = students.map(s => {
      const stat = calculateStudentAttendanceStats(s, startDate, endDate);
      return [
        String(s.rollNo),
        s.name,
        s.fatherName,
        String(workingInfo.totalWorkingDays),
        String(stat.presentDays),
        String(stat.absentDays),
        String(stat.leaveDays),
        `${stat.attendancePercentage}%`,
      ];
    });

    autoTable(doc, {
      head: [['Roll', 'Student Name', 'Father Name', 'Working Days', 'Present', 'Absent', 'Leave', 'Attendance %']],
      body: rows,
      startY: 52,
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 52, bottom: 18, left: 14, right: 14 },
    });

    this.addFooter(doc);

    const fileName = `${monthName}_${year}_Attendance_${classObj.name}_${sectionObj.name}.pdf`;
    return this.downloadOrShare(
      doc,
      fileName,
      {
        title: `Monthly Attendance: ${monthName} ${year}`,
        fileName,
        recordType: 'ATTENDANCE_MONTHLY',
        targetInfo: `${classObj.name} ${sectionObj.name} (${monthName} ${year})`,
      },
      students.length
    );
  }
}
