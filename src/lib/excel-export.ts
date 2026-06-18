'use client';

import * as XLSX from 'xlsx';

/**
 * Exports trip data and expenses into a professionally formatted Excel spreadsheet.
 * Replicates the structure of the user's reference image:
 * - Columns for payers (Expense By)
 * - Columns for split shares (Per Family/Pax)
 * - Summary rows with Net Balances
 */
export const exportTripToExcel = (trip: any, expenses: any[]) => {
  if (!trip || !expenses) return;

  const participants = trip.participants || [];
  const participantNames = participants.map((p: any) => p.name.replace(" (You)", ""));
  
  // Total head count for reference
  const totalPax = participants.reduce((acc: number, p: any) => acc + 1 + (p.familyMembers?.length || 0), 0);

  const rows: any[][] = [];

  // 1. Group Label Header
  const groupLabelRow = ['', '', '', '']; // Spacing for #, Date, Expense, Group
  
  // Header for "Expense By" section
  groupLabelRow.push('EXPENSE BY (Who Paid)');
  for (let i = 0; i < participants.length; i++) groupLabelRow.push('');
  
  // Header for "Split" section
  groupLabelRow.push(`PER FAMILY / PAX (${totalPax} Total Pax)`);
  for (let i = 0; i < participants.length; i++) groupLabelRow.push('');
  
  rows.push(groupLabelRow);

  // 2. Functional Header
  const headerRow = ['#', 'Date', 'Expense', 'Involved Group'];
  participantNames.forEach(name => headerRow.push(name));
  headerRow.push('Total Paid');
  participantNames.forEach(name => headerRow.push(name));
  headerRow.push('Total Share');
  
  rows.push(headerRow);

  // 3. Data Rows
  expenses.forEach((exp, idx) => {
    const amount = parseFloat(exp.amount) || 0;
    const selected = exp.selectedIndividuals || [];
    
    // Generate "Involved Group" text
    const involvedIds = new Set(selected.map((sid: string) => sid.split('-')[0]));
    const involvedNames = participants
      .filter((p: any) => involvedIds.has(p.id))
      .map((p: any) => p.name.replace(" (You)", ""))
      .join(" + ");
    
    const row: any[] = [
      idx + 1, 
      exp.date, 
      exp.description, 
      involvedNames || '—'
    ];

    // Section: Expense By (Payer)
    participants.forEach((p: any) => {
      row.push(exp.payerId === p.id ? amount : 0);
    });
    row.push(amount);

    // Section: Per Family Share
    const shares: Record<string, number> = {};

    if (exp.splitType === 'equal_person') {
      const sharePerPerson = amount / (selected.length || 1);
      selected.forEach((sid: string) => {
        const pid = sid.split('-')[0];
        shares[pid] = (shares[pid] || 0) + sharePerPerson;
      });
    } else if (exp.splitType === 'equal_family') {
      const familyGroups = new Set(selected.map((sid: string) => sid.split('-')[0]));
      const sharePerFamily = amount / (familyGroups.size || 1);
      familyGroups.forEach((pid) => {
        shares[pid] = sharePerFamily;
      });
    } else if (exp.splitType === 'custom') {
      const customAmounts = exp.customAmounts || {};
      selected.forEach((sid: string) => {
        const pid = sid.split('-')[0];
        shares[pid] = (shares[pid] || 0) + (parseFloat(customAmounts[sid]) || 0);
      });
    } else if (exp.splitType === 'just_me') {
      shares[exp.payerId] = amount;
    }

    participants.forEach((p: any) => {
      row.push(shares[p.id] || 0);
    });
    row.push(amount);

    rows.push(row);
  });

  // 4. Summary Rows
  rows.push([]); // Spacer

  const payerStartCol = 4;
  const payerEndCol = payerStartCol + participants.length;
  const shareStartCol = payerEndCol + 1;
  const shareEndCol = shareStartCol + participants.length;

  const totalPaidRow = ['TOTALS', '', '', ''];
  const balanceRow = ['NET BALANCE (Paid - Share)', '', '', ''];

  const colPaidTotals = Array(participants.length + 1).fill(0);
  const colShareTotals = Array(participants.length + 1).fill(0);

  // Summation Logic
  rows.slice(2, rows.length - 1).forEach(row => {
    if (row.length === 0) return;
    for (let i = 0; i <= participants.length; i++) {
      colPaidTotals[i] += (row[payerStartCol + i] || 0);
      colShareTotals[i] += (row[shareStartCol + i] || 0);
    }
  });

  // Construct Total Row
  colPaidTotals.forEach(val => totalPaidRow.push(val));
  totalPaidRow.push(...Array(participants.length + 1).fill('')); // Empty shares for this row

  // Construct Balance Row (matching user's green rows logic)
  balanceRow.push(...Array(participants.length + 1).fill('')); // Empty payers
  participants.forEach((_, i) => {
    const balance = colPaidTotals[i] - colShareTotals[i];
    balanceRow.push(balance);
  });
  balanceRow.push(colPaidTotals[participants.length] - colShareTotals[participants.length]);

  rows.push(totalPaidRow);
  rows.push(balanceRow);

  // 5. Finalize Workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Merging Headers
  ws['!merges'] = [
    { s: { r: 0, c: 4 }, e: { r: 0, c: payerEndCol } }, // Expense By header
    { s: { r: 0, c: shareStartCol }, e: { r: 0, c: shareEndCol } }, // Split header
  ];

  // Column Sizing
  ws['!cols'] = [
    { wch: 4 },  // #
    { wch: 12 }, // Date
    { wch: 30 }, // Expense
    { wch: 30 }, // Group
    ...Array(2 * participants.length + 2).fill({ wch: 12 })
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Trip Summary");
  
  // Trigger Browser Download
  XLSX.writeFile(wb, `${trip.name.replace(/\s+/g, '_')}_Report.xlsx`);
};
