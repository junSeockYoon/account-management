(function () {
  const root = document.getElementById('tx-entry');
  const dataEl = document.getElementById('tx-records');
  if (!root || !dataEl) return;
  const records = JSON.parse(dataEl.textContent);
  const form = root.querySelector('[data-editor]');
  const mode = root.querySelector('[data-mode]');
  const cancel = root.querySelector('[data-tx-cancel]');

  function fill(values) {
    Object.entries(values).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (!field) return;
      field.value = value == null ? '' : String(value);
    });
  }

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

  function setCreate() {
    form.reset();
    form.action = '/transactions';
    form.date.value = root.dataset.asOf;
    form.type.value = 'expense';
    form.paymentMethod.value = 'card';
    form.expenseClass.value = 'variable';
    form.categoryId.value = 'food';
    mode.textContent = '입력';
    cancel.hidden = true;
    sync();
  }

  document.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-tx-action="edit"]');
    if (edit) {
      const values = records[edit.dataset.txId];
      if (!values) return;
      form.reset();
      fill(values);
      form.action = `/transactions/${encodeURIComponent(edit.dataset.txId)}/update`;
      mode.textContent = '수정';
      cancel.hidden = false;
      sync();
      root.scrollIntoView({ block: 'start' });
      form.amount.focus();
      return;
    }
    if (event.target.closest('[data-tx-cancel]')) setCreate();
  });

  document.addEventListener('submit', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.hasAttribute('data-confirm')) return;
    const label = target.getAttribute('data-confirm') || '이 거래';
    if (!window.confirm(`${label} 항목을 삭제할까요?`)) event.preventDefault();
  });

  form.type.addEventListener('change', sync);
  form.paymentMethod.addEventListener('change', sync);
  sync();
})();
