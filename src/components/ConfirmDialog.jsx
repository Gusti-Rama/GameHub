import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ title, message, confirmLabel = 'Konfirmasi', confirmClass = 'btn-danger', onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p className="text-gray-600 text-sm">{message}</p>
      <div className="flex gap-3 mt-6 justify-end">
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className={confirmClass} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
