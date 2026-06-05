import React, { useRef, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * A proper modal dialog component using the native <dialog> element.
 * Replaces window.alert(), window.confirm(), and window.prompt() throughout the app.
 */
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle light-dismiss (clicking backdrop)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, [onClose]);

  // Handle native close event (e.g. Esc key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="modal-title">
      <div className="modal__header">
        <h3 id="modal-title" className="modal__title">{title}</h3>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="modal__body">
        {children}
      </div>
      {actions && (
        <div className="modal__actions">
          {actions}
        </div>
      )}
    </dialog>
  );
};

export default Modal;
