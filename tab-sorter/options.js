// Saves options to chrome.storage
const saveOptions = () => {
    const type = document.getElementById('type').value;
  
    chrome.storage.sync.set(
      { type: type },
      () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { type: 'dicAsc' },
      (items) => {
        document.getElementById('type').value = items.type;
      }
    );
  };
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);