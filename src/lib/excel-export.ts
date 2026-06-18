'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * High-fidelity Excel export mirroring the user's reference image.
 * Uses ExcelJS for professional color coding, grouping, and layout.
 */
export const exportTripToExcel = async (trip: any, expenses: any[]) => {
  if (!trip || !expenses) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Trip Summary');

  const participants = trip.participants || [];
  const participantNames = participants.map((p: any) => p.name.replace(" (You)", ""));
  const numP = participants.length;
  const totalPax = participants.reduce((acc: number, p: any) => acc + 1 + (p.familyMembers?.length || 0), 0);

  // Define Column Structure
  // [#, Date, Expense, Involved Group, ...PayerCols, TotalPaid, ...ShareCols, TotalShare]
  const cols = [
    { header: '#', key: 'idx', width: 5 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Expense', key: 'desc', width: 35 },
    { header: 'Involved Group', key: 'group', width: 40 },
    ...participantNames.map((name, i) => ({ header: name, key: `p_${i}`, width: 12 })),
    { header: 'Total Paid', key: 'total_paid', width: 15 },
    ...participantNames.map((name, i) => ({ header: name, key: `s_${i}`, width: 12 })),
    { header: 'Total Share', key: 'total_share', width: 15 },
  ];
  
  worksheet.columns = cols;

  // 1. TOP HEADER (Merged "Expense By" and "Split")
  const topHeader = worksheet.getRow(1);
  topHeader.values = [];
  topHeader.getCell(5).value = 'Expense By (Who Paid)';
  topHeader.getCell(5 + numP + 1).value = `Split Breakdown (${totalPax} Total Pax)`;
  
  worksheet.mergeCells(1, 5, 1, 5 + numP);
  worksheet.mergeCells(1, 5 + numP + 1, 1, 5 + 2 * numP);
  
  [5, 5 + numP + 1].forEach(colIdx => {
    const cell = topHeader.getCell(colIdx);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    cell.font = { bold: true, size: 12 };
    cell.alignment = { horizontal: 'center' };
  });

  // 2. SUB HEADER (Functional Field Names)
  const headerRow = worksheet.getRow(2);
  headerRow.values = cols.map(c => c.header);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EFF7' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 3. GROUPED DATA LOGIC
  // Sort expenses by splitType to create visual blocks (Per Person, Per Family, etc.)
  const groupedExpenses = expenses.reduce((acc: any, exp: any) => {
    const type = exp.splitType || 'equal_person';
    if (!acc[type]) acc[type] = [];
    acc[type].push(exp);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    'equal_person': 'PER PAX',
    'equal_family': 'PER FAMILY',
    'custom': 'CUSTOM SPLITS',
    'just_me': 'SOLO EXPENSES',
    'unsplit': 'DRAFT (UNSPLIT) ITEMS'
  };

  let rowCursor = 3;
  const colPaidTotals = Array(numP + 1).fill(0);
  const colShareTotals = Array(numP + 1).fill(0);

  Object.entries(groupedExpenses).forEach(([type, items]: [string, any]) => {
    // Add Group Header Row
    const typeHeaderRow = worksheet.getRow(rowCursor++);
    typeHeaderRow.getCell(1).value = typeLabels[type] || type.toUpperCase();
    worksheet.mergeCells(rowCursor - 1, 1, rowCursor - 1, cols.length);
    typeHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
    typeHeaderRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    typeHeaderRow.getCell(1).alignment = { horizontal: 'center' };

    items.forEach((exp: any, i: number) => {
      const amount = parseFloat(exp.amount) || 0;
      const selected = exp.selectedIndividuals || [];
      const shares: Record<string, number> = {};

      // Logic to determine sub-header text for involved group
      const involvedIds = new Set(selected.map((sid: string) => sid.split('-')[0]));
      const involvedNames = participants
        .filter((p: any) => involvedIds.has(p.id))
        .map((p: any) => p.name.replace(" (You)", ""))
        .join(" + ");
      
      const isFullGroup = involvedIds.size === numP;
      const groupText = isFullGroup ? `Between All ${numP} Families` : `Between ${involvedNames}`;

      // Insert Sub-Group Label Row (If not just me)
      if (type !== 'just_me' && i === 0) {
        const subGroupRow = worksheet.getRow(rowCursor++);
        subGroupRow.getCell(4).value = groupText;
        worksheet.mergeCells(rowCursor - 1, 4, rowCursor - 1, cols.length);
        subGroupRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        subGroupRow.getCell(4).font = { italic: true, size: 9 };
      }

      // Calculate Individual Family Shares for Columns
      if (exp.splitType === 'equal_person') {
        const sharePerPerson = amount / (selected.length || 1);
        selected.forEach((sid: string) => {
          const pid = sid.split('-')[0];
          shares[pid] = (shares[pid] || 0) + sharePerPerson;
        });
      } else if (exp.splitType === 'equal_family') {
        const familyGroups = new Set(selected.map((sid: string) => sid.split('-')[0]));
        const sharePerFamily = amount / (familyGroups.size || 1);
        familyGroups.forEach((pid) => { shares[pid] = sharePerFamily; });
      } else if (exp.splitType === 'custom') {
        const customAmounts = exp.customAmounts || {};
        selected.forEach((sid: string) => {
          const pid = sid.split('-')[0];
          shares[pid] = (shares[pid] || 0) + (parseFloat(customAmounts[sid]) || 0);
        });
      } else if (exp.splitType === 'just_me') {
        shares[exp.payerId] = amount;
      }

      // Build the Data Row
      const rowValues: any = {
        idx: i + 1,
        date: exp.date,
        desc: exp.description,
        group: isFullGroup ? '' : groupText,
        total_paid: amount,
        total_share: amount
      };

      participants.forEach((p: any, pIdx: number) => {
        rowValues[`p_${pIdx}`] = exp.payerId === p.id ? amount : 0;
        rowValues[`s_${pIdx}`] = shares[p.id] || 0;

        // Accumulate totals
        colPaidTotals[pIdx] += (rowValues[`p_${pIdx}`]);
        colShareTotals[pIdx] += (rowValues[`s_${pIdx}`]);
      });
      colPaidTotals[numP] += amount;
      colShareTotals[numP] += amount;

      const dataRow = worksheet.addRow(rowValues);
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      rowCursor++;
    });

    worksheet.addRow([]); // Spacer between groups
    rowCursor++;
  });

  // 4. SUMMARY ROWS (Total and Net Balance)
  worksheet.addRow([]); // Extra space
  rowCursor++;

  // TOTALS ROW
  const totalRowValues: any[] = ['TOTALS', '', '', ''];
  for (let i = 0; i <= numP; i++) totalRowValues.push(colPaidTotals[i]);
  for (let i = 0; i <= numP; i++) totalRowValues.push(colShareTotals[i]);
  
  const totalRow = worksheet.addRow(totalRowValues);
  totalRow.eachCell((cell, colIdx) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }; // Light Green
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // NET BALANCE ROW
  const balanceRowValues: any[] = ['NET BALANCE (Paid - Share)', '', '', ''];
  // Empty space for payer section
  for (let i = 0; i <= numP; i++) balanceRowValues.push('');
  // Calculate Balance: Paid minus Share
  for (let i = 0; i < numP; i++) {
    balanceRowValues.push(colPaidTotals[i] - colShareTotals[i]);
  }
  balanceRowValues.push(colPaidTotals[numP] - colShareTotals[numP]);

  const balanceRow = worksheet.addRow(balanceRowValues);
  balanceRow.eachCell((cell, colIdx) => {
    if (colIdx > 5 + numP) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } }; // Dark Green
    }
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Final alignment and column tuning
  worksheet.eachRow(row => {
    row.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  // Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${trip.name.replace(/\s+/g, '_')}_Finance_Report.xlsx`);
};
