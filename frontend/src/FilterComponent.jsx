import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';

export default function FilterComponent({ columns, onFilterChange }) {
    const [activeFilterKeys, setActiveFilterKeys] = useState([]);
    const [filterValues, setFilterValues] = useState({});

    const handleAddFilter = (e) => {
        const key = e.target.value;
        if (key && !activeFilterKeys.includes(key)) {
            const newActiveKeys = [...activeFilterKeys, key];
            setActiveFilterKeys(newActiveKeys);

            const newValues = { ...filterValues, [key]: '' };
            setFilterValues(newValues);

            refreshFilters(newActiveKeys, newValues);
        }
    };

    const handleRemoveFilter = (key) => {
        const newActiveKeys = activeFilterKeys.filter(k => k !== key);
        setActiveFilterKeys(newActiveKeys);

        const newValues = { ...filterValues };
        delete newValues[key];
        setFilterValues(newValues);

        refreshFilters(newActiveKeys, newValues);
    };

    const handleValueChange = (key, value) => {
        const newValues = { ...filterValues, [key]: value };
        setFilterValues(newValues);

        refreshFilters(activeFilterKeys, newValues);
    };

    const refreshFilters = (keys, values) => {
        const finalFilters = {};
        keys.forEach(k => {
            if (values[k] !== undefined && values[k] !== '') {
                finalFilters[k] = values[k];
            }
        });
        onFilterChange(finalFilters);
    };

    const availableColumns = columns.filter(c => !activeFilterKeys.includes(c.key));

    return (
        <div className="filters-panel">
            <div className="filters-header">
                <div className="filters-title">
                    <Filter size={18} /> Filters
                </div>
                <div className="add-filter-container">
                    <label>Add Filter Column:</label>
                    <select
                        className="filter-select"
                        onChange={handleAddFilter}
                        value=""
                    >
                        <option value="" disabled>Select Column...</option>
                        {availableColumns.map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {activeFilterKeys.length > 0 && (
                <div className="filters-grid">
                    {activeFilterKeys.map(key => {
                        const colDef = columns.find(c => c.key === key);
                        if (!colDef) return null;
                        return (
                            <div className="filter-tile" key={key}>
                                <span className="filter-tile-label">{colDef.label}</span>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={filterValues[key] || ''}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    autoFocus
                                />
                                <button
                                    className="remove-filter-btn"
                                    onClick={() => handleRemoveFilter(key)}
                                    title="Remove Filter"
                                    type="button"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
