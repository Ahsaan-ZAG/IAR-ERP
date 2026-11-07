function openRestoreDialog(filename) {
  const dialog = document.getElementById('restoreDialog');
  document.getElementById('restoreFilename').value = filename;
  document.getElementById('restoreFilenameLabel').textContent = filename;
  dialog.showModal();
}