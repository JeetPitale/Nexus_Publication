import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2, Search, Plus, Filter,
  X, LogIn, LogOut, Edit2, Trash2,
  Database, AlertCircle, Download, GripVertical, ChevronDown
} from 'lucide-react';
import FilterComponent from './FilterComponent';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import bcrypt from 'bcryptjs';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const ADMIN_HASH = '$2b$10$xiXaAZst3FE.kbbEiWGd2.yWLiLsUpwua6jAt.SSju44rPXoVNPtO';

const INITIAL_COLUMNS_MAP = {
  'serial_number': 'No.',
  'title_without_author': 'Title without Author',
  'author_code': 'Author Code',
  'author_from_mica': 'Author from MICA',
  'source': 'Source',
  'publication': 'Publication',
  'publication_type': 'Publication Type',
  'material_type': 'Material Type',
  'physical_description': 'Physical Description',
  'country': 'Country',
  'national_international': 'National/International',
  'year': 'Year',
  'fy': 'FY',
  'evaluation_of_publications': 'Evaluation of Publications',
  'impact_factor_v1': 'Impact Factor',
  'abdc_ranking_v1': 'ABDC Ranking',
  'publisher': 'Publisher in case of books and conference proceedings',
  'doi': 'DOI',
  'updated_citation': 'UPDATED CITATION (APA STYLE)',
  'scopus': 'Scopus',
  'clarivate_analytics': 'Clarivate Analytics (WOS)',
  'impact_factor_v2': 'Impact Factor',
  'h_index_sjr': 'h-index (SJR)',
  'ft_50': 'FT-50',
  'abdc_ranking_v2': 'ABDC Ranking',
  'abs_ajg_ranking': 'ABS-AJG Ranking',
  'q_ranking': 'Q Ranking',
  'utd_ranking': 'UTD Ranking'
};

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [newColumnModal, setNewColumnModal] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [renameColumnModal, setRenameColumnModal] = useState(false);
  const [renameColumnKey, setRenameColumnKey] = useState('');
  const [renameColumnLabel, setRenameColumnLabel] = useState('');
  const [rearrangeMode, setRearrangeMode] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [downloadDropdown, setDownloadDropdown] = useState(false);

  // Admin Modal Auth State
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const fetchColumns = async () => {
    try {
      const res = await axios.get(`${API_URL}?action=get_columns`);
      if (res.data.status === 'success') {
        const storedOrder = localStorage.getItem('columnOrder');
        const dbCols = res.data.data.map(col => ({
          key: col.key,
          label: INITIAL_COLUMNS_MAP[col.key] || col.label
        }));

        if (storedOrder) {
          try {
            const parsedOrderKeys = JSON.parse(storedOrder);
            // Re-sort dbCols based on parsed keys
            const sortedCols = [];
            parsedOrderKeys.forEach(k => {
              const f = dbCols.find(c => c.key === k);
              if (f) sortedCols.push(f);
            });
            // Add any missing new columns that aren't in stored memory yet
            dbCols.forEach(c => {
              if (!sortedCols.find(sc => sc.key === c.key)) {
                sortedCols.push(c);
              }
            });
            setColumns(sortedCols);
            return;
          } catch (e) { }
        }
        setColumns(dbCols);
      }
    } catch (err) {
      console.error("Failed to fetch columns:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchColumns();
      await fetchRecords();
      // Artificial delay to make preloader visible
      setTimeout(() => setInitialLoading(false), 1200);
    };
    init();
  }, []);

  const fetchRecords = async () => {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await axios.get(`${API_URL}?${query}`);
      if (res.data.status === 'success') {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecords();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filters]);

  const loginAdmin = () => {
    setLoginModalOpen(true);
  };
  const logoutAdmin = () => setIsAdmin(false);

  const openForm = (record = null) => {
    if (record) {
      setFormData(record);
      setEditingId(record.id);
    } else {
      const initialForm = {};
      columns.forEach(col => initialForm[col.key] = '');
      setFormData(initialForm);
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const closeForm = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: 'Bearer admin-token' };
      if (editingId) {
        await axios.put(API_URL, { ...formData, id: editingId }, { headers });
        toast.success("Publication updated successfully!");
      } else {
        await axios.post(API_URL, formData, { headers });
        toast.success("Publication added successfully!");
      }
      closeForm();
      fetchRecords();
    } catch (err) {
      toast.error("Error saving record. Admin access might be required.");
      console.error(err);
    }
  };

  const deleteRecord = async (id) => {
    try {
      const headers = { Authorization: 'Bearer admin-token' };
      await axios.delete(API_URL, { headers, data: { id } });
      toast.success("Record deleted successfully!");
      fetchRecords();
    } catch (err) {
      toast.error("Error deleting record.");
    }
  };

  const requestDeleteRecord = (id) => {
    toast((t) => (
      <div>
        <p style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>Are you sure you want to delete this publication?</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn-cancel" onClick={() => toast.dismiss(t.id)} style={{ padding: '5px 10px', fontSize: '12px' }}>Cancel</button>
          <button className="btn-add" onClick={() => { toast.dismiss(t.id); deleteRecord(id); }} style={{ background: '#EF4444', padding: '5px 10px', fontSize: '12px' }}>Delete</button>
        </div>
      </div>
    ), { duration: 5000, id: `del-rec-${id}` });
  };

  const deleteColumn = async (colKey) => {
    try {
      const headers = { Authorization: 'Bearer admin-token' };
      const res = await axios.delete(`${API_URL}?action=delete_column&colKey=${colKey}`, { headers });
      if (res.data.status === 'success') {
        // Remove from local storage order
        const storedOrder = localStorage.getItem('columnOrder');
        if (storedOrder) {
          try {
            const parsedOrderKeys = JSON.parse(storedOrder);
            const newOrder = parsedOrderKeys.filter(k => k !== colKey);
            localStorage.setItem('columnOrder', JSON.stringify(newOrder));
          } catch (e) { }
        }
        toast.success("Column deleted successfully!");
        await fetchColumns();
        fetchRecords();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Error deleting column.");
    }
  };

  const requestDeleteColumn = (colKey) => {
    toast((t) => (
      <div>
        <p style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>Delete this column? This is permanent.</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn-cancel" onClick={() => toast.dismiss(t.id)} style={{ padding: '5px 10px', fontSize: '12px' }}>Cancel</button>
          <button className="btn-add" onClick={() => { toast.dismiss(t.id); deleteColumn(colKey); }} style={{ background: '#EF4444', padding: '5px 10px', fontSize: '12px' }}>Delete</button>
        </div>
      </div>
    ), { duration: 5000, id: `del-col-${colKey}` });
  };

  const openRenameModal = (col) => {
    setRenameColumnKey(col.key);
    setRenameColumnLabel(col.label);
    setRenameColumnModal(true);
  };

  const submitRenameColumn = async () => {
    if (!renameColumnLabel.trim()) return;
    try {
      const headers = { Authorization: 'Bearer admin-token' };
      const res = await axios.post(`${API_URL}?action=rename_column`, { 
        old_key: renameColumnKey, 
        new_label: renameColumnLabel 
      }, { headers });
      
      if (res.data.status === 'success') {
        const { old_key, new_key } = res.data.column;
        const storedOrder = localStorage.getItem('columnOrder');
        if (storedOrder) {
          try {
            let parsedOrderKeys = JSON.parse(storedOrder);
            parsedOrderKeys = parsedOrderKeys.map(k => k === old_key ? new_key : k);
            localStorage.setItem('columnOrder', JSON.stringify(parsedOrderKeys));
          } catch (e) { }
        }
        
        setRenameColumnModal(false);
        toast.success("Column renamed successfully!");
        await fetchColumns();
        fetchRecords(); 
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      toast.error("Failed to rename column.");
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setColumns(items);
    localStorage.setItem('columnOrder', JSON.stringify(items.map(c => c.key)));
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row =>
      columns.map(col => `"${(row[col.key] || '').toString().replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'publications_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRowToCSV = (row) => {
    const headers = columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');
    const rowCSV = columns.map(col => `"${(row[col.key] || '').toString().replace(/"/g, '""')}"`).join(',');

    const csvContent = [headers, rowCSV].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `publication_${row.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRowToPDF = (row) => {
    const doc = new jsPDF();
    doc.text(`Publication Details (ID: ${row.id || 'N/A'})`, 14, 15);
    
    const tableData = columns.map(col => [col.label, (row[col.key] || '').toString()]);
    
    doc.autoTable({
      startY: 20,
      head: [['Field', 'Value']],
      body: tableData,
      theme: 'grid',
      styles: { cellWidth: 'wrap' },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });

    doc.save(`publication_${row.id || 'export'}.pdf`);
  };

  if (initialLoading) {
    return (
      <div className="preloader">
        <div className="preloader-circle-container">
          <div className="preloader-circle"></div>
          <div className="preloader-icon-box">
            <Building2 className="preloader-icon" size={32} />
          </div>
        </div>
        <div className="preloader-name">Research Publications Nexus</div>
        <div className="preloader-subtitle">Comprehensive Publication Analytics</div>
        <div className="preloader-footer">
          Developed by <span>Jeet Pitale</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Toaster position="top-center" reverseOrder={false} />
      <header>
        <div className="header-left">
          <div className="header-logo">
            <Building2 size={24} />
          </div>
          <div>
            <h1>Research Publications Nexus</h1>
            <p>Manage and discover comprehensive publication metrics.</p>
          </div>
        </div>
        <div className="auth-controls">
          {isAdmin ? (
            <button className="logout-btn" onClick={logoutAdmin}>
              <LogOut size={16} /> Exit Admin Mode
            </button>
          ) : (
            <button onClick={loginAdmin}>
              <LogIn size={16} /> Admin Login
            </button>
          )}
        </div>
      </header>

      <FilterComponent columns={columns} onFilterChange={setFilters} />

      <div className="action-bar" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        {isAdmin && (
          <>
            <button className="btn-add" onClick={exportToCSV} style={{ background: '#10B981' }}>
              <Download size={16} /> Export to CSV
            </button>
            <button className="btn-add" onClick={() => setRearrangeMode(true)} style={{ background: '#6B7280' }}>
              <Filter size={16} /> Rearrange Columns
            </button>
            <button className="btn-add" onClick={() => setNewColumnModal(true)} style={{ background: '#4F46E5' }}>
              <Plus size={16} /> Add Column
            </button>
            <button className="btn-add" onClick={() => openForm(null)}>
              <Plus size={16} /> Add Publication
            </button>
          </>
        )}
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map(col => {
                  const isCitation = col.key.toLowerCase().includes('citation');
                  const isLong = col.key.toLowerCase().includes('title') || col.key.toLowerCase().includes('source');
                  const isNo = col.key.toLowerCase().includes('no');
                  return (
                    <th 
                      key={col.key} 
                      style={{ 
                        minWidth: isCitation ? '550px' : isLong ? '400px' : isNo ? '60px' : '180px',
                        maxWidth: isCitation ? '550px' : 'none'
                      }}
                    >
                      {col.label}
                    </th>
                  );
                })}
                <th className="sticky-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: '0' }}>
                    <div className="empty-state">
                      <Database className="empty-icon" />
                      <p>No publications matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    {columns.map(col => {
                      const isCitation = col.key.toLowerCase().includes('citation');
                      const isLong = col.key.toLowerCase().includes('title') || col.key.toLowerCase().includes('source');
                      const isNo = col.key.toLowerCase().includes('no');
                      const isTitle = col.key === 'title_without_author';
                      
                      return (
                        <td 
                          key={col.key}
                          style={{ 
                            minWidth: isCitation ? '550px' : isLong ? '400px' : isNo ? '60px' : '180px',
                            maxWidth: isCitation ? '550px' : 'none',
                            cursor: isTitle ? 'pointer' : 'default',
                            color: isTitle ? 'var(--primary)' : 'inherit',
                            textDecoration: isTitle ? 'underline' : 'none'
                          }}
                          onClick={() => {
                            if (isTitle) {
                              setViewingRecord(row);
                            }
                          }}
                        >
                          {row[col.key]}
                        </td>
                      );
                    })}
                    <td className="actions-cell">
                      <button className="btn-icon-grid" onClick={() => exportRowToCSV(row)} title="Export Row">
                        <Download size={16} />
                      </button>
                      {isAdmin && (
                        <>
                          <button className="btn-icon-grid" onClick={() => openForm(row)} title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="btn-icon-grid delete" onClick={() => requestDeleteRecord(row.id)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
                {editingId ? 'Edit Publication' : 'Add New Publication'}
              </h2>
              <button className="close-btn" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <form id="publication-form" onSubmit={submitForm}>
                <div className="form-grid">
                  {columns.map(col => (
                    <div className="form-group" key={col.key}>
                      <label>{col.label}</label>
                      <input
                        type="text"
                        name={col.key}
                        value={formData[col.key] || ''}
                        onChange={handleFormChange}
                        placeholder={`Enter ${col.label}...`}
                      />
                    </div>
                  ))}
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
              <button type="submit" form="publication-form" className="btn-add">
                {editingId ? 'Save Changes' : 'Create Publication'}
              </button>
            </div>
          </div>
        </div>
      )}

      {newColumnModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2><Plus size={20} /> Add New Column</h2>
              <button className="close-btn" onClick={() => setNewColumnModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Column Name (Label)</label>
                <input
                  type="text"
                  value={newColumnLabel}
                  onChange={e => setNewColumnLabel(e.target.value)}
                  placeholder="e.g. Total Citations"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setNewColumnModal(false)}>Cancel</button>
              <button type="button" className="btn-add" onClick={async () => {
                if (!newColumnLabel.trim()) return;
                try {
                  const headers = { Authorization: 'Bearer admin-token' };
                  const res = await axios.post(`${API_URL}?action=add_column`, { label: newColumnLabel }, { headers });
                  if (res.data.status === 'success') {
                    setNewColumnLabel('');
                    setNewColumnModal(false);
                    toast.success("Column added successfully!");
                    await fetchColumns();
                    fetchRecords(); // optionally refresh data
                  } else {
                    toast.error(res.data.message);
                  }
                } catch (e) {
                  toast.error("Failed to add column.");
                }
              }}>Add Column</button>
            </div>
          </div>
        </div>
      )}

      {renameColumnModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2><Edit2 size={20} /> Rename Column</h2>
              <button className="close-btn" onClick={() => setRenameColumnModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>New Column Name (Label)</label>
                <input
                  type="text"
                  value={renameColumnLabel}
                  onChange={e => setRenameColumnLabel(e.target.value)}
                  placeholder="e.g. Total Citations"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setRenameColumnModal(false)}>Cancel</button>
              <button type="button" className="btn-add" onClick={submitRenameColumn}>Rename Column</button>
            </div>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Publication Details</h2>
              <button className="close-btn" onClick={() => setViewingRecord(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {columns.map(col => (
                  <div key={col.key} className="detail-item">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {col.label}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.25rem', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {viewingRecord[col.key] || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center', width: '100%' }}>
              <button type="button" className="btn-cancel" onClick={() => setViewingRecord(null)}>Close</button>
              {isAdmin ? (
                <div style={{ position: 'relative' }}>
                  <button type="button" className="btn-add" style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setDownloadDropdown(!downloadDropdown)}>
                    <Download size={16} /> Export Data <ChevronDown size={16} />
                  </button>
                  {downloadDropdown && (
                    <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 10, minWidth: '150px' }}>
                      <button style={{ width: '100%', padding: '0.75rem 1rem', background: 'white', color: 'var(--text-main)', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }} onClick={() => { exportRowToCSV(viewingRecord); setDownloadDropdown(false); }}>Download as CSV</button>
                      <button style={{ width: '100%', padding: '0.75rem 1rem', background: 'white', color: 'var(--text-main)', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', outline: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }} onClick={() => { exportRowToPDF(viewingRecord); setDownloadDropdown(false); }}>Download as PDF</button>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" className="btn-add" style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => exportRowToPDF(viewingRecord)}>
                  <Download size={16} /> Download PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loginModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2><LogIn size={20} /> Admin Authentication</h2>
              <button className="close-btn" onClick={() => { setLoginModalOpen(false); setLoginError(''); setAdminPasswordInput(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Enter Password</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={e => { setAdminPasswordInput(e.target.value); setLoginError(''); }}
                  placeholder="Password..."
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (bcrypt.compareSync(adminPasswordInput, ADMIN_HASH)) {
                        setIsAdmin(true);
                        setLoginModalOpen(false);
                        setAdminPasswordInput('');
                        toast.success("Logged in as Admin");
                      } else {
                        setLoginError('Incorrect password!');
                      }
                    }
                  }}
                />
                {loginError && <p style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>{loginError}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => { setLoginModalOpen(false); setLoginError(''); setAdminPasswordInput(''); }}>Cancel</button>
              <button type="button" className="btn-add" onClick={() => {
                if (bcrypt.compareSync(adminPasswordInput, ADMIN_HASH)) {
                  setIsAdmin(true);
                  setLoginModalOpen(false);
                  setAdminPasswordInput('');
                  toast.success("Logged in as Admin");
                } else {
                  setLoginError('Incorrect password!');
                }
              }}>Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p>&copy; 2026 Research Publications Nexus. All rights reserved. | Developed by: <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Jeet Pitale</span></p>
      </footer>

      {/* Rearrange Columns Modal */}
      {rearrangeMode && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2><Filter size={20} /> Rearrange Columns</h2>
              <button className="close-btn" onClick={() => setRearrangeMode(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Drag and drop items to change their display order.
              </p>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="columns-list">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="reorder-list"
                    >
                      {columns.map((col, index) => (
                        <Draggable key={col.key} draggableId={col.key} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`reorder-item ${snapshot.isDragging ? 'dragging' : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                                left: snapshot.isDragging ? '0' : provided.draggableProps.style.left,
                                top: snapshot.isDragging ? provided.draggableProps.style.top : 'auto'
                              }}
                            >
                              <div {...provided.dragHandleProps} className="drag-handle">
                                <GripVertical size={18} />
                              </div>
                              <span className="col-label">{col.label}</span>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <button
                                  onClick={() => openRenameModal(col)}
                                  className="edit-col-btn"
                                  title="Rename Column"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => requestDeleteColumn(col.key)}
                                  className="delete-col-btn"
                                  title="Delete Column"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-add" onClick={() => setRearrangeMode(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
