(function () {
  document.addEventListener('submit', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.hasAttribute('data-confirm')) return;
    const label = target.getAttribute('data-confirm') || '이 거래';
    if (!window.confirm(`${label} 항목을 삭제할까요?`)) event.preventDefault();
  });
})();

(function () {
  const root = document.getElementById('tx-entry');
  if (!root) return;
  const form = root.querySelector('[data-editor]');
  if (!form) return;

  function sync() {
    const type = form.type.value;
    form.querySelector('[data-for="class"]').hidden = type !== 'expense';
    form.querySelector('[data-for="payment"]').hidden = type === 'transfer';
    form.querySelector('[data-for="destination"]').hidden = type !== 'transfer';
    if (type === 'income' && form.paymentMethod.value === 'card') form.paymentMethod.value = 'account';
    [...form.paymentMethod.options].forEach((option) => {
      option.disabled = type === 'income' && option.value === 'card';
    });
    const card = type === 'expense' && form.paymentMethod.value === 'card';
    const showAccount = type === 'income' || type === 'transfer' || !card;
    form.querySelector('[data-for="card"]').hidden = !card;
    form.querySelector('[data-for="account"]').hidden = !showAccount;
    const labels = { income: '입금 계좌', transfer: '출금 계좌', expense: form.paymentMethod.value === 'cash' ? '현금 계좌' : '출금 계좌' };
    form.querySelector('[data-account-label]').textContent = labels[type] || '계좌';
    [...form.categoryId.options].forEach((option) => {
      option.disabled = option.dataset.group !== type;
    });
    if (form.categoryId.selectedOptions[0]?.disabled) {
      const next = [...form.categoryId.options].find((option) => !option.disabled);
      if (next) form.categoryId.value = next.value;
    }
  }

  form.type.addEventListener('change', sync);
  form.paymentMethod.addEventListener('change', sync);
  sync();
  const amount = form.elements.namedItem('amount');
  if (amount && !amount.value) amount.focus();
})();

(function () {
  const form = document.querySelector('[data-recurring]');
  if (!form) return;
  const cardBox = form.querySelector('[data-recurring-card]');
  const accountBox = form.querySelector('[data-recurring-account]');
  function sync() {
    const card = form.paymentMethod.value === 'card';
    cardBox.hidden = !card;
    accountBox.hidden = card;
  }
  form.paymentMethod.addEventListener('change', sync);
  sync();
})();
