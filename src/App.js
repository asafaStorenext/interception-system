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
      
      // טעינת כל הרשימות מקובץ ה-config
      if (data.agents && Array.isArray(data.agents)) {
        setAgentOptions(data.agents);
        console.log('✅ Loaded agents:', data.agents.length);
      }
      
      if (data.importance && Array.isArray(data.importance)) {
        setImportanceOptions(data.importance);
        console.log('✅ Loaded importance options:', data.importance.length);
      }
      
      if (data.callNature && Array.isArray(data.callNature)) {
        setCallNatureOptions(data.callNature);
        console.log('✅ Loaded call nature options:', data.callNature.length);
      }
      
      if (data.source && Array.isArray(data.source)) {
        setSourceOptions(data.source);
        console.log('✅ Loaded source options:', data.source.length);
      }
      
      if (data.status && Array.isArray(data.status)) {
        setStatusOptions(data.status);
        console.log('✅ Loaded status options:', data.status.length);
      }
      
      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Error loading config:', error);
      // אם נכשל, השתמש ברשימות ברירת מחדל (כבר מוגדרות ב-state)
      console.log('⚠️ Using default options');
    }
  }, []);

  const loadInterceptions = useCallback(async () => {
    try {
      const response = await fetch(process.env.REACT_APP_SUPABASE_URL + '/rest/v1/interceptions?select=*&order=record_number.asc', {
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_KEY,
          'Authorization': 'Bearer ' + process.env.REACT_APP_SUPABASE_KEY
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
  }, []);

  const initializeApp = useCallback(async () => {
    // בדיקת שם משתמש
    const savedUserName = getUserName();
    if (!savedUserName) {
      setShowNamePrompt(true);
    } else {
      setUserName(savedUserName);
      loadInterceptions();
    }
  }, [loadInterceptions]);

  useEffect(() => {
    initializeApp();
    loadConfig();
  }, [initializeApp, loadConfig]);

  const getUserName = () => {
    // שם משתמש נשמר ב-localStorage
    return localStorage.getItem('userName');
  };

  const saveUserName = (name) => {
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
  // DATABASE FUNCTIONS - Supabase
  // ============================================
  
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
        const response = await fetch(process.env.REACT_APP_SUPABASE_URL + '/rest/v1/interceptions?id=eq.' + item.id, {
          method: 'PATCH',
          headers: {
            'apikey': process.env.REACT_APP_SUPABASE_KEY,
            'Authorization': 'Bearer ' + process.env.REACT_APP_SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(formatted)
        });
        
        // אם הרשומה לא קיימת, הכנס אותה
        if (response.status === 404 || response.status === 406) {
          await fetch(process.env.REACT_APP_SUPABASE_URL + '/rest/v1/interceptions', {
            method: 'POST',
            headers: {
              'apikey': process.env.REACT_APP_SUPABASE_KEY,
              'Authorization': 'Bearer ' + process.env.REACT_APP_SUPABASE_KEY,
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
  // FORM HANDLING
  // ============================================

  const validatePhone = (value) => {
    return /^\d{0,10}$/.test(value);
  };

  const validateHP = (value) => {
    return /^\d{0,13}$/.test(value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone' && !validatePhone(value)) return;
    if (name === 'hp' && !validateHP(value)) return;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.importance || 
        !formData.callNature || !formData.source) {
      setFormError('יש למלא את כל השדות החובה');
      setTimeout(() => setFormError(''), 3000);
      return;
    }

    const newRecord = {
      id: Date.now().toString(),
      recordNumber: interceptions.length + 1,
      ...formData,
      createdBy: userName,
      createdAt: new Date().toISOString()
    };

    const updatedData = [...interceptions, newRecord];
    setInterceptions(updatedData);
    await saveToDatabase(updatedData);

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

    alert('הרשומה נוספה בהצלחה!');
  };

  // ============================================
  // TABLE FUNCTIONS
  // ============================================

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    try {
      // מחיקה מ-Supabase
      await fetch(process.env.REACT_APP_SUPABASE_URL + '/rest/v1/interceptions?id=eq.' + deleteConfirm, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_KEY,
          'Authorization': 'Bearer ' + process.env.REACT_APP_SUPABASE_KEY
        }
      });

      const updatedData = interceptions.filter(item => item.id !== deleteConfirm);
      setInterceptions(updatedData);
      setDeleteConfirm(null);
      alert('הרשומה נמחקה בהצלחה!');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('שגיאה במחיקת הרשומה');
    }
  };

  const handleEdit = (record) => {
    setEditingRow({...record});
  };

  const handleSaveEdit = async () => {
    const updatedData = interceptions.map(item => 
      item.id === editingRow.id ? editingRow : item
    );
    
    setInterceptions(updatedData);
    await saveToDatabase(updatedData);
    setEditingRow(null);
    alert('השינויים נשמרו בהצלחה!');
  };

  const handleNotesEdit = (id, notes) => {
    setEditingNotes(prev => ({
      ...prev,
      [id]: notes
    }));
  };

  const handleNotesSave = async (id) => {
    const updatedData = interceptions.map(item => 
      item.id === id ? {...item, agentNotes: editingNotes[id] || item.agentNotes} : item
    );
    
    setInterceptions(updatedData);
    await saveToDatabase(updatedData);
    
    setEditingNotes(prev => {
      const newNotes = {...prev};
      delete newNotes[id];
      return newNotes;
    });
    
    alert('ההערות נשמרו בהצלחה!');
  };

  // ============================================
  // STATISTICS
  // ============================================

  const getStats = () => {
    const total = interceptions.length;
    const handled = interceptions.filter(i => i.status === 'טופל').length;
    const pending = interceptions.filter(i => !i.status || i.status === '').length;
    
    const agentStats = {};
    interceptions.forEach(i => {
      if (i.assignedAgent) {
        agentStats[i.assignedAgent] = (agentStats[i.assignedAgent] || 0) + 1;
      }
    });

    return { total, handled, pending, agentStats };
  };

  const stats = getStats();

  // ============================================
  // FILTERING
  // ============================================

  const filteredInterceptions = interceptions.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(search) ||
      item.phone.includes(search) ||
      item.hp.includes(search) ||
      item.importance.toLowerCase().includes(search) ||
      item.callNature.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search) ||
      (item.assignedAgent && item.assignedAgent.toLowerCase().includes(search)) ||
      (item.status && item.status.toLowerCase().includes(search))
    );
  });

  // ============================================
  // RENDER
  // ============================================

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ברוך הבא למערכת ניהול יירוטים</h2>
            <p className="text-gray-600">אנא הזן את שמך המלא להמשך</p>
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
                placeholder="הזן שם מלא"
                autoFocus
              />
            </div>
            <button
              onClick={handleSaveName}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              המשך
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <BarChart3 size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">מערכת ניהול יירוטים</h1>
                <p className="text-blue-100 text-sm">משתמש: {userName}</p>
              </div>
            </div>
            <button
              onClick={handleEditUserName}
              className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition flex items-center gap-2"
            >
              <User size={18} />
              <span>עריכת שם</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-4">
            <button
              onClick={() => setCurrentPage('form')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                currentPage === 'form'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Plus size={20} className="inline ml-2" />
              טופס יירוט חדש
            </button>
            <button
              onClick={() => setCurrentPage('table')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                currentPage === 'table'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Search size={20} className="inline ml-2" />
              רשימת יירוטים
            </button>
            <button
              onClick={() => setCurrentPage('stats')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                currentPage === 'stats'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 size={20} className="inline ml-2" />
              סטטיסטיקות
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {formError && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            {formError}
          </div>
        )}

        {/* Form Page */}
        {currentPage === 'form' && (
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Plus size={24} className="text-blue-600" />
              </div>
              יירוט חדש
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">שם מלא *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">טלפון (עד 10 ספרות) *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">ח.פ (עד 13 ספרות)</label>
                  <input
                    type="text"
                    name="hp"
                    value={formData.hp}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    maxLength="13"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">חשיבות *</label>
                  <select
                    name="importance"
                    value={formData.importance}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    required
                  >
                    <option value="">בחר חשיבות</option>
                    {importanceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">מהות השיחה *</label>
                  <select
                    name="callNature"
                    value={formData.callNature}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    required
                  >
                    <option value="">בחר מהות</option>
                    {callNatureOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">מקור יירוט *</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    required
                  >
                    <option value="">בחר מקור</option>
                    {sourceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">הערות</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">פרטי טיפול (אופציונלי)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">נציג מטפל</label>
                    <select
                      name="assignedAgent"
                      value={formData.assignedAgent}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="">בחר נציג</option>
                      {agentOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">סטטוס</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="">בחר סטטוס</option>
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-gray-700 font-medium mb-2">הערות נציג</label>
                  <textarea
                    name="agentNotes"
                    value={formData.agentNotes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-medium text-lg shadow-lg"
              >
                שמור יירוט
              </button>
            </form>
          </div>
        )}

        {/* Table Page */}
        {currentPage === 'table' && (
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Search size={24} className="text-blue-600" />
                </div>
                רשימת יירוטים ({filteredInterceptions.length})
              </h2>
              <div className="relative w-full md:w-96">
                <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם, טלפון, נציג..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <th className="p-4 text-right text-sm font-semibold">מס' רשומה</th>
                    <th className="p-4 text-right text-sm font-semibold">שם</th>
                    <th className="p-4 text-right text-sm font-semibold">טלפון</th>
                    <th className="p-4 text-right text-sm font-semibold">ח.פ</th>
                    <th className="p-4 text-right text-sm font-semibold">חשיבות</th>
                    <th className="p-4 text-right text-sm font-semibold">מהות</th>
                    <th className="p-4 text-right text-sm font-semibold">מקור</th>
                    <th className="p-4 text-right text-sm font-semibold">נציג</th>
                    <th className="p-4 text-right text-sm font-semibold">סטטוס</th>
                    <th className="p-4 text-right text-sm font-semibold">הערות נציג</th>
                    <th className="p-4 text-right text-sm font-semibold">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterceptions.map((item, index) => (
                    <tr key={item.id} className={`border-b hover:bg-blue-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-4 text-sm font-medium text-gray-700">{item.recordNumber}</td>
                      <td className="p-4 text-sm text-gray-800">{item.name}</td>
                      <td className="p-4 text-sm text-gray-700 font-mono">{item.phone}</td>
                      <td className="p-4 text-sm text-gray-700 font-mono">{item.hp}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.importance === 'משביתה' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.importance}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700">{item.callNature}</td>
                      <td className="p-4 text-sm text-gray-700">{item.source}</td>
                      <td className="p-4 text-sm text-gray-700">{item.assignedAgent || '-'}</td>
                      <td className="p-4 text-sm">
                        {item.status ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            {item.status}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {editingNotes[item.id] !== undefined ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingNotes[item.id]}
                              onChange={(e) => handleNotesEdit(item.id, e.target.value)}
                              className="flex-1 p-2 border border-gray-300 rounded text-sm"
                            />
                            <button
                              onClick={() => handleNotesSave(item.id)}
                              className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
                            >
                              <Save size={16} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleNotesEdit(item.id, item.agentNotes)}
                            className="cursor-pointer hover:bg-gray-100 p-2 rounded transition"
                          >
                            {item.agentNotes || 'לחץ להוספת הערה'}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
                            title="עריכה"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
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
            </div>

            {filteredInterceptions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">לא נמצאו תוצאות</p>
              </div>
            )}
          </div>
        )}

        {/* Stats Page */}
        {currentPage === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">סה"כ יירוטים</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <BarChart3 size={32} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">טופלו</p>
                    <p className="text-3xl font-bold text-green-600">{stats.handled}</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <BarChart3 size={32} className="text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">ממתינים</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                  </div>
                  <div className="bg-orange-100 p-4 rounded-lg">
                    <BarChart3 size={32} className="text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">פילוח לפי נציגים</h3>
              <div className="space-y-4">
                {Object.entries(stats.agentStats).map(([agent, count]) => (
                  <div key={agent} className="flex items-center gap-4">
                    <div className="w-32 text-gray-700 font-medium">{agent}</div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all duration-500"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-gray-600 text-sm">
                      {((count / stats.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(stats.agentStats).length === 0 && (
                <p className="text-center text-gray-500 py-8">אין נתונים זמינים</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-6 rounded-t-lg flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-bold">עריכת רשומה #{editingRow.recordNumber}</h3>
              <button onClick={() => setEditingRow(null)} className="p-2 hover:bg-white/20 rounded transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2 text-sm">שם מלא</label>
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
