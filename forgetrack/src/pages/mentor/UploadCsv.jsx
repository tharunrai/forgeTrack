import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { openRouter, DEFAULT_AI_MODEL } from '../../lib/gemini';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  Calendar, 
  Database,
  Layers,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Heuristic fallback for column matching if the AI API is offline or key is missing
function runLocalHeuristicAnalysis(headers, sampleRows) {
  let usn_column = null;
  let name_column = null;
  const sessions = [];

  const usnKeywords = ['usn', 'roll', 'register', 'reg', 'id', 'seat', 'student_id', 'admission'];
  const nameKeywords = ['name', 'student_name', 'full_name', 'first_name', 'candidate'];
  const ignoreKeywords = ['sl', 'sno', 'no', 'index', 'serial', 'total', 'percentage', 'remarks', 'branch', 'email', 'phone'];

  headers.forEach(h => {
    const hl = h.toLowerCase().trim();
    if (usnKeywords.some(k => hl.includes(k)) && !usn_column) {
      usn_column = h;
    } else if (nameKeywords.some(k => hl.includes(k)) && !name_column) {
      name_column = h;
    }
  });

  // Safe defaults if still not detected
  if (!usn_column && headers.length > 0) usn_column = headers[0];
  if (!name_column && headers.length > 1) name_column = headers[1] !== usn_column ? headers[1] : headers[0];

  headers.forEach(h => {
    if (h === usn_column || h === name_column) return;
    const hl = h.toLowerCase().trim();
    if (ignoreKeywords.some(k => hl === k || hl.startsWith(k))) return;

    // Check if it's a date
    let dateStr = null;
    let isValid = false;
    const timestamp = Date.parse(h);
    if (!isNaN(timestamp)) {
      const d = new Date(timestamp);
      // Adjust timezone offset to prevent shifting dates
      const userTimezoneOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - userTimezoneOffset);
      dateStr = localDate.toISOString().split('T')[0];
      isValid = true;
    } else {
      // Look for format patterns like "7-May" or "07/05"
      const dateRegex = /(\d{1,2})[-/\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})/i;
      if (dateRegex.test(h)) {
        const parsedDate = new Date(h + ' ' + new Date().getFullYear());
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
          isValid = true;
        }
      }
    }

    sessions.push({
      column: h,
      date: dateStr,
      is_valid_date: isValid
    });
  });

  return { usn_column, name_column, sessions };
}

export default function UploadCsv() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Sheet Select, 3: AI Analysis / Review, 4: Sync Progress, 5: Success
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(''); // 'csv' or 'xlsx'
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  
  // Parsed spreadsheet data
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  
  // AI Agent matched results
  const [mapping, setMapping] = useState({
    usn_column: '',
    name_column: '',
    sessions: []
  });

  // Gap-filling details
  const [usualWeekdays, setUsualWeekdays] = useState([]); // Array of weekdays ['Mon', 'Wed']
  const [startDate, setStartDate] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Duplication conflicts
  const [conflicts, setConflicts] = useState([]); // List of dates that already exist
  const [conflictAction, setConflictAction] = useState('skip'); // 'skip', 'overwrite'

  // Sync statistics
  const [syncStats, setSyncStats] = useState({ students: 0, sessions: 0, attendance: 0 });
  const [syncStatusText, setSyncStatusText] = useState('');

  // Handle Drag & Drop
  const handleDragOver = (e) => e.preventDefault();
  
  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
      setFileType('csv');
      parseCsv(selectedFile);
    } else if (ext === 'xlsx' || ext === 'xls') {
      setFileType('xlsx');
      parseXlsx(selectedFile);
    } else {
      alert('Unsupported file format. Please upload a CSV or Excel (.xlsx) file.');
      setFile(null);
    }
  };

  // CSV Parsing
  const parseCsv = (csvFile) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const headers = Object.keys(results.data[0]);
          setParsedHeaders(headers);
          setParsedRows(results.data);
          analyzeWithAiAgent(headers, results.data.slice(0, 3));
        } else {
          alert('Empty CSV file.');
        }
      }
    });
  };

  // XLSX Parsing
  const parseXlsx = (xlsxFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const wb = XLSX.read(data, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      
      if (wb.SheetNames.length === 1) {
        // Single sheet Excel - parse directly
        setSelectedSheets([wb.SheetNames[0]]);
        extractExcelSheetData(wb, wb.SheetNames[0]);
      } else {
        // Multiple sheets Excel - let user select
        setStep(2);
      }
    };
    reader.readAsBinaryString(xlsxFile);
  };

  const extractExcelSheetData = (wb, sheetName) => {
    const worksheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    if (jsonData.length > 0) {
      const headers = Object.keys(jsonData[0]);
      setParsedHeaders(headers);
      setParsedRows(jsonData);
      analyzeWithAiAgent(headers, jsonData.slice(0, 3));
    } else {
      alert(`The sheet "${sheetName}" is empty.`);
    }
  };

  const handleMultiSheetSubmit = () => {
    if (selectedSheets.length === 0) {
      alert('Please select at least one sheet.');
      return;
    }

    // Read and merge data from selected sheets
    let combinedRows = [];
    let combinedHeaders = new Set();

    selectedSheets.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      if (jsonData.length > 0) {
        jsonData.forEach(row => combinedRows.push(row));
        Object.keys(jsonData[0]).forEach(h => combinedHeaders.add(h));
      }
    });

    if (combinedRows.length > 0) {
      const headers = Array.from(combinedHeaders);
      setParsedHeaders(headers);
      setParsedRows(combinedRows);
      analyzeWithAiAgent(headers, combinedRows.slice(0, 3));
    } else {
      alert('No data found in selected sheets.');
    }
  };

  // AI Agent matching headers and identifying dates
  const analyzeWithAiAgent = async (headers, samples) => {
    setStep(3);
    setIsAiAnalyzing(true);

    try {
      // AI Agent Prompt
      const prompt = `Analyze these spreadsheet column headers and sample rows to match attendance fields:
Headers: ${JSON.stringify(headers)}
Sample Rows: ${JSON.stringify(samples)}

Identify:
1. USN column (student ID/Roll number)
2. Student Name column
3. Session columns (columns representing attendance sessions, typically dates or labeled like "Session 1", "Week 1", "05-May", etc. Attendance values are usually 1/0, P/A, Present/Absent, etc.)

Return ONLY a valid JSON object matching this structure (no markdown wrapper, no notes):
{
  "usn_column": "exact_column_header_name",
  "name_column": "exact_column_header_name",
  "sessions": [
    {
      "column": "exact_session_column_header",
      "date": "YYYY-MM-DD_or_null_if_not_parsable",
      "is_valid_date": true_or_false
    }
  ]
}`;

      const response = await openRouter.chat.completions.create({
        model: DEFAULT_AI_MODEL,
        messages: [{ role: "user", content: prompt }]
      });

      const responseText = response.choices[0].message.content.trim();
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(cleanJson);

      const heuristicResult = runLocalHeuristicAnalysis(headers, samples);
      
      const finalizedResult = {
        usn_column: aiResult.usn_column || aiResult.usn || heuristicResult.usn_column,
        name_column: aiResult.name_column || aiResult.name || heuristicResult.name_column,
        sessions: aiResult.sessions && aiResult.sessions.length > 0 ? aiResult.sessions : heuristicResult.sessions
      };

      // Ensure they correspond to actual headers in the spreadsheet
      if (!headers.includes(finalizedResult.usn_column)) {
        finalizedResult.usn_column = heuristicResult.usn_column;
      }
      if (!headers.includes(finalizedResult.name_column)) {
        finalizedResult.name_column = heuristicResult.name_column;
      }
      
      setMapping(finalizedResult);
      checkDuplicateSessions(finalizedResult.sessions);
    } catch (err) {
      console.warn('AI analysis failed or timed out. Running robust local heuristic match as fallback...', err);
      const heuristicResult = runLocalHeuristicAnalysis(headers, samples);
      setMapping(heuristicResult);
      checkDuplicateSessions(heuristicResult.sessions);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Check if any identified dates already exist in the sessions table
  const checkDuplicateSessions = async (sessionsList) => {
    const datesToCheck = sessionsList
      .filter(s => s.is_valid_date && s.date)
      .map(s => s.date);

    if (datesToCheck.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('date')
        .in('date', datesToCheck);

      if (!error && data && data.length > 0) {
        setConflicts(data.map(d => d.date));
      } else {
        setConflicts([]);
      }
    } catch (e) {
      console.error('Error checking duplicate sessions:', e);
    }
  };

  // Generate missing dates based on usual weekdays and start date
  const handleSuggestDates = () => {
    if (usualWeekdays.length === 0) {
      alert('Please select at least one usual weekday.');
      return;
    }
    if (!startDate) {
      alert('Please select an estimated Start Date.');
      return;
    }

    const weekdayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const weekdayIndices = usualWeekdays.map(w => weekdayMap[w]);

    let currentDate = new Date(startDate);
    const updatedSessions = [...mapping.sessions];

    updatedSessions.forEach((session) => {
      if (!session.is_valid_date || !session.date) {
        // Find next valid weekday
        while (!weekdayIndices.includes(currentDate.getDay())) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        session.date = currentDate.toISOString().split('T')[0];
        session.is_valid_date = true;
        session.is_suggested = true;

        // Increment for next iteration
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    setMapping({ ...mapping, sessions: updatedSessions });
    checkDuplicateSessions(updatedSessions);
  };

  const handleManualDateChange = (index, value) => {
    const updatedSessions = [...mapping.sessions];
    updatedSessions[index].date = value;
    updatedSessions[index].is_valid_date = value ? true : false;
    setMapping({ ...mapping, sessions: updatedSessions });
    checkDuplicateSessions(updatedSessions);
  };

  // Synchronize spreadsheet data to Supabase
  const syncToDatabase = async () => {
    setStep(4);
    setSyncStatusText('Initializing synchronization...');

    try {
      const validSessions = mapping.sessions.filter(s => s.is_valid_date && s.date);
      const usnCol = mapping.usn_column;
      const nameCol = mapping.name_column;

      if (!usnCol || !nameCol) {
        throw new Error('USN or Student Name column was not mapped.');
      }

      let createdSessionsCount = 0;
      let createdStudentsCount = 0;
      let attendanceMarksCount = 0;

      // 1. Process Sessions (Filter out duplicates if "skip" is chosen)
      setSyncStatusText('Creating curriculum sessions...');
      const sessionMap = {}; // Maps date string to session database ID

      for (const s of validSessions) {
        const isConflict = conflicts.includes(s.date);
        
        if (isConflict && conflictAction === 'skip') {
          // Fetch existing session ID to link attendance
          const { data: existingS } = await supabase
            .from('sessions')
            .select('id')
            .eq('date', s.date)
            .single();
          
          if (existingS) sessionMap[s.date] = existingS.id;
          continue;
        }

        // Upsert Session
        const { data: sessionRecord, error: sErr } = await supabase
          .from('sessions')
          .upsert({
            date: s.date,
            topic: s.column, // Use column header as fallback topic
            month_number: new Date(s.date).getMonth() + 1,
            duration_hours: 2.0,
            session_type: 'offline'
          }, { onConflict: 'date' })
          .select('id')
          .single();

        if (sErr) throw sErr;
        sessionMap[s.date] = sessionRecord.id;
        createdSessionsCount++;
      }

      // 2. Process Students & Attendance
      setSyncStatusText('Syncing student accounts & marking attendance...');

      for (const row of parsedRows) {
        const usn = row[usnCol]?.toString().trim();
        const name = row[nameCol]?.toString().trim();

        if (!usn || !name) continue;

        // Upsert Student Profile
        const { data: studentRecord, error: stuErr } = await supabase
          .from('students')
          .upsert({
            name: name,
            usn: usn,
            branch_code: usn.length >= 7 ? usn.substring(5, 7).toUpperCase() : 'CS',
            is_active: true
          }, { onConflict: 'usn' })
          .select('id')
          .single();

        if (stuErr) {
          console.error(`Error saving student ${usn}:`, stuErr.message);
          continue;
        }
        createdStudentsCount++;

        // Sync attendance columns for this student
        for (const s of validSessions) {
          const rawAttendanceValue = row[s.column]?.toString().toLowerCase().trim();
          
          // Interpret attendance values (e.g., 'p', 'present', '1', 'y', 'yes' represent Present)
          const isPresent = ['p', 'present', '1', 'y', 'yes', 'checked'].includes(rawAttendanceValue);
          const sessionId = sessionMap[s.date];

          if (sessionId && studentRecord.id) {
            const { error: attErr } = await supabase
              .from('attendance')
              .upsert({
                student_id: studentRecord.id,
                session_id: sessionId,
                present: isPresent,
                marked_by: 'AI Bulk Importer'
              }, { onConflict: 'student_id,session_id' });

            if (!attErr) attendanceMarksCount++;
          }
        }
      }

      setSyncStats({
        students: createdStudentsCount,
        sessions: createdSessionsCount,
        attendance: attendanceMarksCount
      });
      setStep(5);

    } catch (err) {
      console.error(err);
      alert(`Synchronization failed: ${err.message || err}`);
      setStep(3);
    }
  };

  const toggleWeekday = (day) => {
    if (usualWeekdays.includes(day)) {
      setUsualWeekdays(usualWeekdays.filter(w => w !== day));
    } else {
      setUsualWeekdays([...usualWeekdays, day]);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
      
      {/* Brutalist Header Banner */}
      <div className="bg-[#FFE600] border-[3px] border-black p-6 shadow-[5px_5px_0_#000] relative">
        <h1 className="text-3xl font-black text-black leading-none flex items-center gap-3">
          <Database size={28} strokeWidth={2.5} />
          Bulk Attendance AI Importer
        </h1>
        <p className="text-black font-mono text-xs uppercase tracking-wider mt-2 font-bold">
          Phase 4: Intelligent spreadsheet parsing & gap resolution
        </p>
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {step === 1 && (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleFileDrop}
          className="bg-white border-[3px] border-black p-10 shadow-[5px_5px_0_#000] text-center space-y-6 hover:shadow-[7px_7px_0_#000] transition-all cursor-pointer"
        >
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <Upload size={54} className="text-[#FF3B00]" strokeWidth={2.5} />
            <p className="text-xl font-black uppercase text-black">Drag & Drop Attendance Spreadsheet</p>
            <p className="text-gray-500 font-mono text-xs max-w-md">
              Supports standard <strong>.CSV</strong> or <strong>.XLSX (Excel)</strong> sheets.
            </p>
          </div>

          <div className="flex justify-center items-center gap-4">
            <label className="btn-primary flex items-center gap-2 cursor-pointer">
              Choose File
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: SHEET SELECTION (Excel sheets) */}
      {step === 2 && (
        <div className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0_#000] space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-black text-black flex items-center gap-2">
              <Layers size={20} strokeWidth={2.5} />
              Multiple Sheets Found
            </h2>
            <p className="text-gray-500 font-mono text-xs mt-1">
              Select one or multiple sheets to merge and process for attendance.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border-[2px] border-black p-4 bg-[#F5F0E8]">
            {sheetNames.map((sheet) => (
              <label 
                key={sheet} 
                className={`flex items-center gap-3 p-3 border-[2px] border-black cursor-pointer font-bold font-mono text-sm transition-colors ${
                  selectedSheets.includes(sheet) ? 'bg-[#FFE600] text-black' : 'bg-white hover:bg-gray-100'
                }`}
              >
                <input 
                  type="checkbox"
                  checked={selectedSheets.includes(sheet)}
                  onChange={() => {
                    if (selectedSheets.includes(sheet)) {
                      setSelectedSheets(selectedSheets.filter(s => s !== sheet));
                    } else {
                      setSelectedSheets([...selectedSheets, sheet]);
                    }
                  }}
                  className="w-4 h-4 accent-black"
                />
                {sheet}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setStep(1)}>Go Back</button>
            <button className="btn-primary" onClick={handleMultiSheetSubmit}>Confirm Selection</button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & RESOLVE DATA */}
      {step === 3 && (
        <div className="space-y-6">
          {isAiAnalyzing ? (
            <div className="bg-white border-[3px] border-black p-10 shadow-[5px_5px_0_#000] text-center space-y-4 py-16">
              <RefreshCw className="animate-spin text-[#FF3B00] mx-auto" size={48} strokeWidth={2.5} />
              <h3 className="text-lg font-black uppercase text-black font-mono">AI Agent Analyzing Spreadsheet Structure...</h3>
              <p className="text-gray-500 font-mono text-xs">
                AI is mapping headers, parsing dates, and checking database structures. Please wait.
              </p>
            </div>
          ) : (
            <div className="bg-white border-[3px] border-black p-6 shadow-[5px_5px_0_#000] space-y-6">
              <div>
                <h2 className="text-lg font-black text-black">Review AI Field Mapping</h2>
                <p className="text-gray-500 font-mono text-xs mt-1">
                  AI successfully scanned the spreadsheet. Review the column matching before writing to the database.
                </p>
              </div>

              {/* Column Mapping Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-[2px] border-black p-4 bg-[#F5F0E8] relative shadow-[3px_3px_0_#000]">
                  <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold">Matched USN (Roll No) Field</p>
                  <select 
                    className="input mt-2 bg-white"
                    value={mapping.usn_column}
                    onChange={(e) => setMapping({ ...mapping, usn_column: e.target.value })}
                  >
                    <option value="">Select USN Column</option>
                    {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="border-[2px] border-black p-4 bg-[#F5F0E8] relative shadow-[3px_3px_0_#000]">
                  <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold">Matched Student Name Field</p>
                  <select 
                    className="input mt-2 bg-white"
                    value={mapping.name_column}
                    onChange={(e) => setMapping({ ...mapping, name_column: e.target.value })}
                  >
                    <option value="">Select Name Column</option>
                    {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* RESOLVE MISSING DATES (CONSTRAINT 4) */}
              {mapping.sessions.some(s => !s.is_valid_date) && (
                <div className="border-[3px] border-[#FF3B00] bg-white p-5 shadow-[4px_4px_0_#000] space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="text-[#FF3B00] shrink-0" strokeWidth={2.5} />
                    <div>
                      <h4 className="font-black text-black uppercase text-sm">⚠️ Date Gaps Detected in Headers</h4>
                      <p className="text-gray-500 font-mono text-[11px] mt-1">
                        Some session columns have attendance data but are missing proper calendar dates from the header.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div className="space-y-2">
                      <p className="font-mono text-xs font-black text-black">1. Which days of the week is this class usually taken?</p>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekday(day)}
                            className={`px-3 py-1.5 border-[2px] border-black font-mono text-xs font-black transition-colors ${
                              usualWeekdays.includes(day) ? 'bg-[#FFE600] text-black' : 'bg-white hover:bg-gray-100'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-mono text-xs font-black text-black">2. What is the estimated Start Date of these sessions?</p>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="input flex-1 bg-white"
                        />
                        <button 
                          type="button"
                          onClick={handleSuggestDates}
                          className="btn-primary"
                        >
                          Suggest Dates
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicate Conflicts Warning (Constraint 3) */}
              {conflicts.length > 0 && (
                <div className="border-[3px] border-[#000] bg-[#FFDDDD] p-5 shadow-[4px_4px_0_#000] space-y-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="text-[#CC0000] shrink-0" strokeWidth={2.5} />
                    <div>
                      <h4 className="font-black text-[#CC0000] uppercase text-sm">🚨 Duplicate Sessions Detected</h4>
                      <p className="text-gray-600 font-mono text-[11px] mt-1">
                        Spreadsheet has sessions on {conflicts.map(c => new Date(c).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')} which already exist in the database.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 border-t-[2px] border-black/10 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer font-bold font-mono text-xs">
                      <input 
                        type="radio" 
                        name="conflictAction" 
                        value="skip" 
                        checked={conflictAction === 'skip'}
                        onChange={() => setConflictAction('skip')}
                        className="w-4 h-4 accent-black"
                      />
                      Skip Duplicates (Avoid Overwrite)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold font-mono text-xs">
                      <input 
                        type="radio" 
                        name="conflictAction" 
                        value="overwrite" 
                        checked={conflictAction === 'overwrite'}
                        onChange={() => setConflictAction('overwrite')}
                        className="w-4 h-4 accent-black"
                      />
                      Overwrite Existing Database Records
                    </label>
                  </div>
                </div>
              )}

              {/* Sessions Mapping List */}
              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-wider font-black">// Attendance Columns Mapping</p>
                <div className="border-[2px] border-black divide-y divide-black max-h-64 overflow-y-auto custom-scrollbar">
                  {mapping.sessions.map((sess, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-gray-400" />
                        <span className="font-bold">{sess.column}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sess.is_suggested && (
                          <span className="text-[9px] font-black bg-[#CCFFDD] text-[#00AA33] border border-black px-1.5 py-0.5 uppercase">
                            Suggested
                          </span>
                        )}
                        <Calendar size={14} className="text-gray-500" />
                        <input
                          type="date"
                          value={sess.date || ''}
                          onChange={(e) => handleManualDateChange(idx, e.target.value)}
                          className="border-[2px] border-black bg-white px-2 py-1 text-xs font-bold outline-none font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 📊 Spreadsheet Preview Table */}
              <div className="space-y-3 pt-2">
                <p className="font-mono text-xs uppercase tracking-wider font-black">// Live Spreadsheet Data Preview ({parsedRows.length} Rows)</p>
                <div className="overflow-auto max-h-[400px] border-[3px] border-black shadow-[4px_4px_0_#000] custom-scrollbar relative">
                  <table className="w-full text-left font-mono text-[11px]" style={{ borderCollapse: 'collapse' }}>
                    <thead className="sticky top-0 z-10 shadow-[0_3px_0_#000]">
                      <tr className="bg-[#FFE600]">
                        {parsedHeaders.map((header, idx) => {
                          const isUsn = header === mapping.usn_column;
                          const isName = header === mapping.name_column;
                          const isSession = mapping.sessions.some(s => s.column === header);
                          
                          let bgClass = "bg-[#FFE600] text-black border-black";
                          let label = "";
                          if (isUsn) {
                            bgClass = "bg-black text-white border-black";
                            label = " [USN]";
                          } else if (isName) {
                            bgClass = "bg-[#0047FF] text-white border-black";
                            label = " [Name]";
                          } else if (isSession) {
                            bgClass = "bg-[#FF3B00] text-white border-black";
                            label = " [Session]";
                          }

                          return (
                            <th 
                              key={idx} 
                              className={`py-2.5 px-3 uppercase font-black border-b-[3px] border-r-[2px] border-black whitespace-nowrap ${bgClass}`}
                            >
                              {header}{label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b-[2px] border-black hover:bg-[#F5F0E8] transition-colors bg-white">
                          {parsedHeaders.map((header, colIdx) => {
                            const val = row[header];
                            return (
                              <td key={colIdx} className="py-2 px-3 border-r-[2px] border-black text-black font-medium">
                                {val !== undefined && val !== null ? val.toString() : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-500 font-mono italic">
                  * Showing all {parsedRows.length} rows. Matched columns are highlighted for visual confirmation. You can scroll vertically and horizontally.
                </p>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t-[2px] border-black">
                <button className="btn-secondary" onClick={() => setStep(1)}>Cancel</button>
                <button 
                  className="btn-primary flex items-center gap-2"
                  onClick={syncToDatabase}
                >
                  <Database size={16} />
                  Sync to Database
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: SYNC PROGRESS SCREEN */}
      {step === 4 && (
        <div className="bg-white border-[3px] border-black p-10 shadow-[5px_5px_0_#000] text-center space-y-6 py-16 animate-fade-in">
          <RefreshCw className="animate-spin text-[#FF3B00] mx-auto" size={54} strokeWidth={2.5} />
          <h3 className="text-xl font-black uppercase text-black">Synchronizing Attendance Records</h3>
          <p className="text-gray-500 font-mono text-sm max-w-md mx-auto">{syncStatusText}</p>
          <div className="w-full bg-[#F5F0E8] border-[3px] border-black h-4 relative overflow-hidden max-w-sm mx-auto">
            <div className="bg-black h-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS SCREEN */}
      {step === 5 && (
        <div className="bg-white border-[3px] border-black p-10 shadow-[5px_5px_0_#000] text-center space-y-6 py-16 animate-fade-in">
          <CheckCircle2 className="text-[#00CC44] mx-auto" size={64} strokeWidth={2.5} />
          <div className="space-y-2">
            <h3 className="text-3xl font-black uppercase text-black">Sync Complete!</h3>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
              Spreadsheet synchronized successfully with no integrity errors
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto py-4 bg-[#F5F0E8] border-[2px] border-black p-4 shadow-[3px_3px_0_#000]">
            <div>
              <p className="text-3xl font-black text-black leading-none">{syncStats.students}</p>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase font-bold">Students Synced</p>
            </div>
            <div className="border-x-[2px] border-black/10">
              <p className="text-3xl font-black text-black leading-none">{syncStats.sessions}</p>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase font-bold">Sessions Saved</p>
            </div>
            <div>
              <p className="text-3xl font-black text-black leading-none">{syncStats.attendance}</p>
              <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase font-bold">Marks Recorded</p>
            </div>
          </div>

          <div className="pt-4">
            <button className="btn-primary" onClick={() => setStep(1)}>
              Upload Another Spreadsheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
