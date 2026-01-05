import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
<<<<<<< HEAD
    <Root />
=======
    <App />
>>>>>>> d9281b1fc6c9a4c3a95768ac72edd079d6f6e859
