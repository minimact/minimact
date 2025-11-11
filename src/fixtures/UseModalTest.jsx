import { useModal } from '@minimact/core';

function ModalExample() {
  const modal = useModal();

  return (
    <div className="modal-example">
      <button onClick={modal.open}>Open Modal</button>

      {modal.isOpen && (
        <div className="modal-backdrop" onClick={modal.close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Modal Title</h2>
            <p>This is a modal dialog.</p>
            <button onClick={modal.close}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
