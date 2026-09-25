import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster, toast } from 'sonner';

const root = document.createElement('div');
root.id = 'toast-root';
document.body.appendChild(root);

createRoot(root).render(
  <Toaster position="top-center" richColors closeButton duration={5000} />
);

window.toast = toast;
