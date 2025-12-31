import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search, BarChart3, Edit2, X, Save, User } from 'lucide-react';

const InterceptionSystem = () => {
  const [currentPage, setCurrentPage] = useState('form');
  const [interceptions, setInterceptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formError, setFormError] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editingNotes, setEditingNotes] = useState({}); // שמירת הערות זמניות
  const [userName, setUserName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [tempName, setTempName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hp: '',
    importance: '',
    callNature: '',
    source: '',
    notes: '',
    assignedAgent: '',
    status: '',
    agentNotes: ''
  });

  const [importanceOptions, setImportanceOptions] = useState(['גבוהה', 'משביתה']);
  const [callNatureOptions, setCallNatureOptions] = useState(['כספת רפאל', 'פורטלים', 'B2B', 'מזון', 'שלמה סיקסט', 'תמיר', 'ATM', 'כספות', 'אחר']);
  const [sourceOptions, setSourceOptions] = useState(['טלפון', 'אימייל', 'אתר']);
  const [agentOptions, setAgentOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState(['טופל', 'אין מענה', 'בבדיקה', 'תואם מועד אחר']);

  // ============================================
  // INITIALIZATION & USER MANAGEMENT
  // ============================================
  
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/config.json');
      const data = await response.json();
  
      if (data.agents) setAgentOptions(data.agents);
      if (data.importance) setImportanceOptions(data.importance);
      if (data.callNature) setCallNatureOptions(data.callNature);
      if (data.source) setSourceOptions(data.source);
      if (data.status) setStatusOptions(data.status);
  
      console.log('✅ Loaded configuration');
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }, []);

  const initializeApp = useCallback(async () => {
    const savedUserName = await getUserName();
    if (!savedUserName) {
      setShowNamePrompt(true);
    } else {
      setUserName(savedUserName);
      loadInterceptions();
    }
  }, []);

  useEffect(() => {
    initializeApp();
    loadConfig();
  }, [initializeApp, loadConfig]);

  const getUserName = async () => {
    // שם משתמש נשמר ב-localStorage
    return localStorage.getItem('userName');
  };

  const saveUserName = async (name) => {
    // שם משתמש נשמר ב-localStorage
    localStorage.setItem('userName', name);
  };

  const handleSaveName = () => {
    if (!tempName.trim()) {
      alert('אנא הזן שם מלא');
      return;
    }
    setUserName(tempName);
    saveUserName(tempName);
    setShowNamePrompt(false);
    setShowNameEdit(false);
    loadInterceptions();
  };

  const handleEditUserName = () => {
    setTempName(userName);
    setShowNameEdit(true);
  };

  // ============================================
  // DATABASE CONFIGURATION - Supabase
  // ============================================
  
  const SUPABASE_URL = 'https://xerogacrvmrbbawnhqdt.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlcm9nYWNydm1yYmJhd25ocWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNzA0NzMsImV4cCI6MjA4Mjc0NjQ3M30.v0BmaZmy35ExecqZXNnjFoYk3k8ByR4skUWIuxkvSyk';
  
  // ============================================
  // DATABASE FUNCTIONS - Supabase
  // ============================================
  
  const loadInterceptions = async () => {
    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/interceptions?select=*&order=record_number.asc', {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Supabase: ' + response.status);
      }
      
      const data = await response.json();
      
      const formatted = data.map(item => ({
        id: item.id,
        recordNumber: item.record_number,
        name: item.name || '',
        phone: item.phone || '',
        hp: item.hp || '',
        importance: item.importance || '',
        callNature: item.call_nature || '',
        source: item.source || '',
        notes: item.notes || '',
        assignedAgent: item.assigned_agent || '',
        status: item.status || '',
        agentNotes: item.agent_notes || '',
        createdBy: item.created_by || '',
        createdAt: item.created_at || ''
      }));
      
      setInterceptions(formatted);
      console.log('✅ Loaded', formatted.length, 'records from Supabase');
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      setFormError('שגיאה בטעינת נתונים. בדוק את החיבור ל-Supabase');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const saveToDatabase = async (data) => {
    try {
      // במקום למחוק ולהכניס מחדש, נעדכן כל רשומה בנפרד
      for (const item of data) {
        const formatted = {
          id: item.id,
          record_number: item.recordNumber,
          name: item.name || '',
          phone: item.phone || '',
          hp: item.hp || '',
          importance: item.importance || '',
          call_nature: item.callNature || '',
          source: item.source || '',
          notes: item.notes || '',
          assigned_agent: item.assignedAgent || '',
          status: item.status || '',
          agent_notes: item.agentNotes || '',
          created_by: item.createdBy || '',
          created_at: item.createdAt || ''
        };
        
        // נסה לעדכן, אם לא קיים - הכנס חדש
        const response = await fetch(SUPABASE_URL + '/rest/v1/interceptions?id=eq.' + item.id, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(formatted)
        });
        
        // אם הרשומה לא קיימת, הכנס אותה
        if (response.status === 404 || response.status === 406) {
          await fetch(SUPABASE_URL + '/rest/v1/interceptions', {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(formatted)
          });
        }
      }
      
      console.log('✅ Saved', data.length, 'records to Supabase');
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      setFormError('שגיאה בשמירת נתונים');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  // ============================================
  // END OF DATABASE FUNCTIONS
  // ============================================

  const getImportanceColor = (importance) => {
    switch(importance) {
      case 'גבוהה': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'משביתה': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCallNatureColor = (nature) => {
    const colors = {
      'כספת רפאל': 'bg-purple-100 text-purple-800 border-purple-300',
      'פורטלים': 'bg-blue-100 text-blue-800 border-blue-300',
      'B2B': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'מזון': 'bg-green-100 text-green-800 border-green-300',
      'שלמה סיקסט': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'תמיר': 'bg-pink-100 text-pink-800 border-pink-300',
      'ATM': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'כספות': 'bg-teal-100 text-teal-800 border-teal-300',
      'אחר': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[nature] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'טופל': return 'bg-green-100 text-green-800 border-green-300';
      case 'אין מענה': return 'bg-red-100 text-red-800 border-red-300';
      case 'בבדיקה': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'תואם מועד אחר': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgentColor = (agent) => {
    const colors = {
      'יוסי': 'bg-purple-100 text-purple-800 border-purple-300',
      'דנה': 'bg-pink-100 text-pink-800 border-pink-300',
      'רועי': 'bg-blue-100 text-blue-800 border-blue-300',
      'מיכל': 'bg-green-100 text-green-800 border-green-300',
      'אבי': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'שרון': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'אורי': 'bg-cyan-100 text-cyan-800 border-cyan-300'
    };
    return colors[agent] || 'bg-gray-100 text-gray-800';
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('he-IL');
    const time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return date + ' ' + time;
  };

  const validatePhone = (value) => {
    return /^\d{0,10}$/.test(value);
  };

  const validateHP = (value) => {
    return /^\d{0,13}$/.test(value);
  };

  const handlePhoneChange = (value) => {
    if (validatePhone(value)) {
      setFormData({...formData, phone: value});
    }
  };

  const handleHPChange = (value) => {
    if (validateHP(value)) {
      setFormData({...formData, hp: value});
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || !formData.hp || !formData.importance || 
        !formData.callNature || !formData.source) {
      setFormError('אנא מלא את כל השדות החובה');
      setTimeout(() => setFormError(''), 3000);
      return;
    }

    // מציאת המספר הסידורי הגבוה ביותר
    const maxRecordNumber = interceptions.length > 0 
      ? Math.max(...interceptions.map(i => i.recordNumber || 0))
      : 0;

    const newInterception = {
      id: Date.now(),
      recordNumber: maxRecordNumber + 1,
      ...formData,
      createdAt: getCurrentDateTime(),
      createdBy: userName
    };
    const updatedData = [...interceptions, newInterception];
    setInterceptions(updatedData);
    saveToDatabase(updatedData);
    setFormData({
      name: '',
      phone: '',
      hp: '',
      importance: '',
      callNature: '',
      source: '',
      notes: '',
      assignedAgent: '',
      status: '',
      agentNotes: ''
    });
    setCurrentPage('table');
  };

  const handleFieldChange = (id, field, value) => {
    // עבור הערות נציג - רק עדכון מקומי, לא שמירה
    if (field === 'agentNotes') {
      setEditingNotes({...editingNotes, [id]: value});
      return;
    }
    
    // עבור שאר השדות - שמירה מיידית
    const updatedData = interceptions.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setInterceptions(updatedData);
    saveToDatabase(updatedData);
  };

  const handleSaveAgentNotes = (id) => {
    const noteValue = editingNotes[id] || '';
    const updatedData = interceptions.map(item => 
      item.id === id ? { ...item, agentNotes: noteValue } : item
    );
    setInterceptions(updatedData);
    saveToDatabase(updatedData);
    
    // נקה את ההערה הזמנית
    const newEditingNotes = {...editingNotes};
    delete newEditingNotes[id];
    setEditingNotes(newEditingNotes);
  };

  const handleEdit = (item) => {
    setEditingRow({ ...item });
  };

  const handleSaveEdit = () => {
    const updatedData = interceptions.map(item => 
      item.id === editingRow.id ? editingRow : item
    );
    setInterceptions(updatedData);
    saveToDatabase(updatedData);
    setEditingRow(null);
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    const updatedData = interceptions.filter(item => item.id !== deleteConfirm);
    setInterceptions(updatedData);
    saveToDatabase(updatedData);
    setDeleteConfirm(null);
  };

  const filteredInterceptions = interceptions.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.phone.includes(searchTerm) ||
    item.hp.includes(searchTerm)
  );

  const getStatusStats = () => {
    const stats = {};
    interceptions.forEach(item => {
      if (item.status) {
        stats[item.status] = (stats[item.status] || 0) + 1;
      }
    });
    return stats;
  };

  const stats = getStatusStats();
  const unassignedCount = interceptions.filter(i => !i.assignedAgent).length;

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
              <User size={48} className="text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">ברוכים הבאים</h2>
            <p className="text-gray-600">אנא הזן את שמך המלא להתחלת עבודה</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">שם מלא</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הזן שם מלא"
                autoFocus
              />
            </div>
            <button
              onClick={handleSaveName}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium text-lg shadow-md"
            >
              התחל עבודה
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 md:p-4 shadow-lg">
        <div className="container mx-auto flex flex-wrap gap-2 md:gap-4 items-center justify-between">
          <div className="flex gap-2 md:gap-4">
            <button
              onClick={() => setCurrentPage('form')}
              className={'px-4 md:px-6 py-2 rounded-lg transition text-sm md:text-base ' + (currentPage === 'form' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-500')}
            >
              <Plus className="inline ml-2" size={18} />
              יירוט חדש
            </button>
            <button
              onClick={() => setCurrentPage('table')}
              className={'px-4 md:px-6 py-2 rounded-lg transition text-sm md:text-base ' + (currentPage === 'table' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-500')}
            >
              טבלת יירוטים ({interceptions.length})
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={'px-4 md:px-6 py-2 rounded-lg transition text-sm md:text-base ' + (currentPage === 'dashboard' ? 'bg-blue-800 shadow-lg' : 'hover:bg-blue-500')}
            >
              <BarChart3 className="inline ml-2" size={18} />
              דשבורד
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm bg-blue-800 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-900 transition" onClick={handleEditUserName}>
            <User size={16} />
            <span>{userName}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-3 md:p-6">
        {currentPage === 'form' && (
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-4 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">יירוט חדש</h2>
            
            {formError && (
              <div className="mb-4 p-4 bg-red-100 border-r-4 border-red-500 text-red-700 rounded">
                {formError}
              </div>
            )}
            
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">שם *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הזן שם מלא"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">טלפון * (עד 10 ספרות)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0501234567"
                    maxLength="10"
                  />
                  <div className="text-xs text-gray-500 mt-1">{formData.phone.length}/10 ספרות</div>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">ח.פ * (עד 13 ספרות)</label>
                  <input
                    type="text"
                    value={formData.hp}
                    onChange={(e) => handleHPChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123456789"
                    maxLength="13"
                  />
                  <div className="text-xs text-gray-500 mt-1">{formData.hp.length}/13 ספרות</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">חשיבות *</label>
                  <select
                    value={formData.importance}
                    onChange={(e) => setFormData({...formData, importance: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">בחר חשיבות</option>
                    {importanceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">מהות השיחה *</label>
                  <select
                    value={formData.callNature}
                    onChange={(e) => setFormData({...formData, callNature: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">בחר מהות</option>
                    {callNatureOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-3">מקור יירוט *</label>
                <div className="flex flex-wrap gap-4 md:gap-6">
                  {sourceOptions.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="source"
                        value={opt}
                        checked={formData.source === opt}
                        onChange={(e) => setFormData({...formData, source: e.target.value})}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">הערות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="4"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הערות נוספות..."
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-medium text-lg shadow-md"
              >
                שמור יירוט
              </button>
            </div>
          </div>
        )}

        {currentPage === 'table' && (
          <div className="bg-white rounded-lg shadow-lg p-3 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">טבלת יירוטים</h2>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 w-full md:w-auto">
                <Search size={20} className="text-gray-500" />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם, טלפון או ח.פ"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none w-full md:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300">
                    <th className="p-2 md:p-3 text-right text-sm">#</th>
                    <th className="p-2 md:p-3 text-right text-sm">שם</th>
                    <th className="p-2 md:p-3 text-right text-sm">טלפון</th>
                    <th className="p-2 md:p-3 text-right text-sm">ח.פ</th>
                    <th className="p-2 md:p-3 text-right text-sm">חשיבות</th>
                    <th className="p-2 md:p-3 text-right text-sm">מהות השיחה</th>
                    <th className="p-2 md:p-3 text-right text-sm">מקור</th>
                    <th className="p-2 md:p-3 text-right text-sm">הערות</th>
                    <th className="p-2 md:p-3 text-right text-sm">נציג מטפל</th>
                    <th className="p-2 md:p-3 text-right text-sm">סטטוס</th>
                    <th className="p-2 md:p-3 text-right text-sm">הערות נציג</th>
                    <th className="p-2 md:p-3 text-right text-sm">נוצר ע״י</th>
                    <th className="p-2 md:p-3 text-right text-sm">תאריך ושעה</th>
                    <th className="p-2 md:p-3 text-right text-sm">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterceptions.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-2 md:p-3 text-sm font-bold text-gray-600">{item.recordNumber}</td>
                      <td className="p-2 md:p-3 font-medium text-sm">{item.name}</td>
                      <td className="p-2 md:p-3 text-sm">{item.phone}</td>
                      <td className="p-2 md:p-3 text-sm">{item.hp}</td>
                      <td className="p-2 md:p-3">
                        <span className={'px-2 py-1 rounded-full text-xs font-medium border ' + getImportanceColor(item.importance)}>
                          {item.importance}
                        </span>
                      </td>
                      <td className="p-2 md:p-3">
                        <span className={'px-2 py-1 rounded-full text-xs font-medium border ' + getCallNatureColor(item.callNature)}>
                          {item.callNature}
                        </span>
                      </td>
                      <td className="p-2 md:p-3 text-sm">{item.source}</td>
                      <td className="p-2 md:p-3 max-w-xs truncate text-gray-600 text-sm">{item.notes}</td>
                      <td className="p-2 md:p-3">
                        <select
                          value={item.assignedAgent || ''}
                          onChange={(e) => handleFieldChange(item.id, 'assignedAgent', e.target.value)}
                          className={'w-full p-2 rounded-lg border font-medium text-xs ' + (item.assignedAgent ? getAgentColor(item.assignedAgent) + ' border-2' : 'bg-white border-gray-300')}
                        >
                          <option value="">בחר נציג</option>
                          {agentOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 md:p-3">
                        <select
                          value={item.status || ''}
                          onChange={(e) => handleFieldChange(item.id, 'status', e.target.value)}
                          className={'w-full p-2 rounded-lg border font-medium text-xs ' + (item.status ? getStatusColor(item.status) + ' border-2' : 'bg-white border-gray-300')}
                        >
                          <option value="">בחר סטטוס</option>
                          {statusOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 md:p-3">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editingNotes[item.id] !== undefined ? editingNotes[item.id] : item.agentNotes || ''}
                            onChange={(e) => handleFieldChange(item.id, 'agentNotes', e.target.value)}
                            placeholder="הערות נציג..."
                            className="flex-1 p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleSaveAgentNotes(item.id)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            title="שמור הערה"
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="p-2 md:p-3 text-xs text-gray-600">{item.createdBy}</td>
                      <td className="p-2 md:p-3 text-xs text-gray-600 whitespace-nowrap">{item.createdAt}</td>
                      <td className="p-2 md:p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="עריכה מלאה"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="מחיקה"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInterceptions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'לא נמצאו תוצאות' : 'אין יירוטים עדיין. צור יירוט חדש!'}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'dashboard' && (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800">דשבורד סטטיסטיקות</h2>
            
            <div className="mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-700">סיכום כללי</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 rounded-lg border-r-4 border-blue-500 shadow-md">
                  <div className="text-2xl md:text-3xl font-bold text-blue-600">{interceptions.length}</div>
                  <div className="text-gray-700 mt-2 font-medium text-xs md:text-sm">סך הכל יירוטים</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-6 rounded-lg border-r-4 border-green-500 shadow-md">
                  <div className="text-2xl md:text-3xl font-bold text-green-600">
                    {interceptions.filter(i => i.status === 'טופל').length}
                  </div>
                  <div className="text-gray-700 mt-2 font-medium text-xs md:text-sm">יירוטים שטופלו</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 md:p-6 rounded-lg border-r-4 border-yellow-500 shadow-md">
                  <div className="text-2xl md:text-3xl font-bold text-yellow-600">
                    {interceptions.filter(i => i.status === 'בבדיקה').length}
                  </div>
                  <div className="text-gray-700 mt-2 font-medium text-xs md:text-sm">בבדיקה</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 md:p-6 rounded-lg border-r-4 border-red-500 shadow-md">
                  <div className="text-2xl md:text-3xl font-bold text-red-600">
                    {interceptions.filter(i => !i.status).length}
                  </div>
                  <div className="text-gray-700 mt-2 font-medium text-xs md:text-sm">ממתינים לטיפול</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 rounded-lg border-r-4 border-gray-500 shadow-md">
                  <div className="text-2xl md:text-3xl font-bold text-gray-600">{unassignedCount}</div>
                  <div className="text-gray-700 mt-2 font-medium text-xs md:text-sm">ללא נציג מוקצה</div>
                </div>
              </div>
            </div>

            <div className="mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-700">פילוח לפי סטטוס</h3>
              <div className="space-y-3 md:space-y-4">
                {statusOptions.map(status => {
                  const count = stats[status] || 0;
                  const percentage = interceptions.length > 0 ? (count / interceptions.length * 100).toFixed(1) : 0;
                  return (
                    <div key={status} className="flex items-center gap-2 md:gap-4">
                      <div className="w-28 md:w-40">
                        <span className={'px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium border ' + getStatusColor(status)}>
                          {status}
                        </span>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-8 md:h-10 relative overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 md:px-4"
                          style={{ width: percentage + '%' }}
                        >
                          {count > 0 && (
                            <span className="text-white font-bold text-xs md:text-sm">{count}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-12 md:w-20 text-left text-gray-700 font-semibold text-xs md:text-sm">{percentage}%</div>
                    </div>
                  );
                })}
                {Object.keys(stats).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    אין נתונים להצגה. הוסף יירוטים עם סטטוס!
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-700">סטטיסטיקות נוספות</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-6 rounded-lg shadow-md border-r-4 border-orange-500">
                  <div className="text-gray-700 mb-2 font-medium text-sm">חשיבות גבוהה</div>
                  <div className="text-2xl md:text-3xl font-bold text-orange-600">
                    {interceptions.filter(i => i.importance === 'גבוהה').length}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 md:p-6 rounded-lg shadow-md border-r-4 border-red-500">
                  <div className="text-gray-700 mb-2 font-medium text-sm">משביתה</div>
                  <div className="text-2xl md:text-3xl font-bold text-red-600">
                    {interceptions.filter(i => i.importance === 'משביתה').length}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 md:p-6 rounded-lg shadow-md border-r-4 border-purple-500">
                  <div className="text-gray-700 mb-2 font-medium text-sm">עם נציג מוקצה</div>
                  <div className="text-2xl md:text-3xl font-bold text-purple-600">
                    {interceptions.filter(i => i.assignedAgent).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white border-b p-4 md:p-6 flex justify-between items-center rounded-t-lg">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">עריכה מלאה</h3>
              <button
                onClick={() => setEditingRow(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">שם</label>
                  <input
                    type="text"
                    value={editingRow.name}
                    onChange={(e) => setEditingRow({...editingRow, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">טלפון (עד 10 ספרות)</label>
                  <input
                    type="text"
                    value={editingRow.phone}
                    onChange={(e) => validatePhone(e.target.value) && setEditingRow({...editingRow, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    maxLength="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">ח.פ (עד 13 ספרות)</label>
                  <input
                    type="text"
                    value={editingRow.hp}
                    onChange={(e) => validateHP(e.target.value) && setEditingRow({...editingRow, hp: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    maxLength="13"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">חשיבות</label>
                  <select
                    value={editingRow.importance}
                    onChange={(e) => setEditingRow({...editingRow, importance: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    {importanceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">מהות השיחה</label>
                  <select
                    value={editingRow.callNature}
                    onChange={(e) => setEditingRow({...editingRow, callNature: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    {callNatureOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">מקור יירוט</label>
                  <select
                    value={editingRow.source}
                    onChange={(e) => setEditingRow({...editingRow, source: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    {sourceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2 text-sm">הערות</label>
                <textarea
                  value={editingRow.notes}
                  onChange={(e) => setEditingRow({...editingRow, notes: e.target.value})}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-lg font-semibold mb-4 text-gray-700">פרטי טיפול</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm">נציג מטפל</label>
                    <select
                      value={editingRow.assignedAgent || ''}
                      onChange={(e) => setEditingRow({...editingRow, assignedAgent: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">בחר נציג</option>
                      {agentOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm">סטטוס</label>
                    <select
                      value={editingRow.status || ''}
                      onChange={(e) => setEditingRow({...editingRow, status: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">בחר סטטוס</option>
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-gray-700 font-medium mb-2 text-sm">הערות נציג</label>
                  <textarea
                    value={editingRow.agentNotes || ''}
                    onChange={(e) => setEditingRow({...editingRow, agentNotes: e.target.value})}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-4 md:p-6 flex gap-4 rounded-b-lg border-t">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                שמור שינויים
              </button>
              <button
                onClick={() => setEditingRow(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">אישור מחיקה</h3>
            <p className="text-gray-600 mb-6">האם אתה בטוח שברצונך למחוק רשומה זו?</p>
            <div className="flex gap-4">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">עריכת שם משתמש</h3>
              <button onClick={() => setShowNameEdit(false)} className="p-2 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">שם מלא</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSaveName}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterceptionSystem;
