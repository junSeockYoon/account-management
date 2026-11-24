(function () {
  const dialog = document.getElementById('challenge-dialog');
  if (!dialog) return;
  if (dialog.dataset.open === '1') dialog.showModal();
  document.querySelectorAll('[data-open-challenge]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!dialog.open) dialog.showModal();
    });
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
