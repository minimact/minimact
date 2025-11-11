import { useDropdown, Routes } from '@minimact/core';

function UnitSelector() {
  const dropdown = useDropdown(Routes.Api.Units.GetAll);

  return (
    <div className="unit-selector">
      <label>Select Unit:</label>
      <select {...dropdown.props}>
        <option value="">-- Select --</option>
        {dropdown.items.map(unit => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
      <p>Selected: {dropdown.selectedItem?.name || 'None'}</p>
    </div>
  );
}
