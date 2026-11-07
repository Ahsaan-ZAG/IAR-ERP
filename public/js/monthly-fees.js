document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('payModal');
  if (!modal) return;

  // Collect Fee button par click event lagana
  document.querySelectorAll('.btn-collect').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const balance = btn.dataset.balance;
      const month = btn.dataset.month;

      document.getElementById('payStudentId').value = id;
      document.getElementById('payStudentName').textContent = name;
      document.getElementById('payMonth').value = month;
      document.getElementById('payMonthLabel').textContent = month;
      document.getElementById('payAmount').value = balance;
      
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      }
    });
  });

  // Cancel button handle karna
  const cancelBtn = modal.querySelector('.btn-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.close();
    });
  }
});
