/**
 * Import Script for Infopark Kochi Phase 1 Companies
 * Reads Infopark_Kochi_Phase_1_Companies_With_Numbers.xlsx directly
 * Validates, formats, and upserts into Supabase PostgreSQL idempotently.
 *
 * Usage:
 *   node scripts/import_excel.js
 *
 * Requirements in .env or .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=ey... (or NEXT_PUBLIC_SUPABASE_ANON_KEY if policies allow)
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const excelFilePath = path.join(__dirname, '..', 'Infopark_Kochi_Phase_1_Companies_With_Numbers.xlsx');

if (!fs.existsSync(excelFilePath)) {
  console.error(`Excel file not found at: ${excelFilePath}`);
  process.exit(1);
}

console.log(`Reading Excel file from ${excelFilePath}...`);
const workbook = xlsx.readFile(excelFilePath);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

// Parse raw rows
const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log(`Total rows in sheet (including header): ${rawRows.length}`);

if (rawRows.length < 2) {
  console.error('No data found in worksheet!');
  process.exit(1);
}

const header = rawRows[0];
console.log('Detected Header:', header);

const validCompanies = [];
let skippedCount = 0;

for (let i = 1; i < rawRows.length; i++) {
  const row = rawRows[i];
  if (!row || row.length === 0) continue;

  const serialNum = parseInt(row[0], 10);
  const companyName = row[1] ? String(row[1]).trim() : '';
  const contactNumber = row[2] ? String(row[2]).trim() : '';

  // Exclude rows without company name or contact number
  if (!companyName || !contactNumber) {
    console.warn(`Row ${i + 1} skipped: missing company name or contact number.`);
    skippedCount++;
    continue;
  }

  validCompanies.push({
    serial_number: isNaN(serialNum) ? i : serialNum,
    company_name: companyName,
    phone_number: contactNumber,
    status: 'NOT_CONTACTED',
  });
}

console.log(`Parsed ${validCompanies.length} valid companies with numbers.`);
console.log(`Skipped ${skippedCount} incomplete rows.`);

// Check Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('\nSupabase credentials not configured in environment.');
  console.log('To import into remote Supabase, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('Alternatively, run the SQL script: supabase/schema.sql in the Supabase SQL Editor.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runImport() {
  console.log(`\nImporting ${validCompanies.length} companies to Supabase (${supabaseUrl})...`);

  // Batch insert in chunks of 50
  const chunkSize = 50;
  let totalUpserted = 0;

  for (let i = 0; i < validCompanies.length; i += chunkSize) {
    const chunk = validCompanies.slice(i, i + chunkSize);
    
    // Idempotent upsert on company_name
    const { data, error } = await supabase
      .from('companies')
      .upsert(chunk, { 
        onConflict: 'company_name',
        ignoreDuplicates: false // Keep existing rows but update serial/phone if needed
      });

    if (error) {
      console.error(`Error importing chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      totalUpserted += chunk.length;
      console.log(`Batch ${Math.floor(i / chunkSize) + 1}: upserted ${chunk.length} records...`);
    }
  }

  console.log(`\nImport complete! Successfully processed ${totalUpserted} companies.`);
}

runImport().catch(err => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
