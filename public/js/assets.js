(function () {
  const dataEl = document.getElementById('asset-records');
  if (!dataEl) return;
  const records = JSON.parse(dataEl.textContent);

  const types = {
    account: {
      dialogId: 'dialog-account',
      create: '/assets/accounts',
      update: '/assets/accounts/:id/update',
      remove: '/assets/accounts/:id/delete',
    },
    deposit: {
      dialogId: 'dialog-deposit',
      create: '/assets/deposits',
      update: '/assets/deposits/:id/update',
      remove: '/assets/deposits/:id/delete',
    },
    savings: {
      dialogId: 'dialog-savings',
      create: '/assets/savings',
      update: '/assets/savings/:id/update',
      remove: '/assets/savings/:id/delete',
    },
    stock: {
      dialogId: 'dialog-stock',
      create: '/assets/stocks',
      update: '/assets/stocks/:id/update',
      remove: '/assets/stocks/:id/delete',
    },
    card: {
      dialogId: 'dialog-card',
      create: '/assets/cards',
      update: '/assets/cards/:id/update',
      remove: '/assets/cards/:id/delete',
    },
  };

  function fill(form, values) {
    Object.entries(values).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (!field) return;
      field.value = value == null ? '' : String(value);
    });
  }

  function toggleCard(form) {
    if (!form.elements.namedItem('type')) return;
    const debit = form.elements.type.value === 'debit';
    const debitFields = form.querySelector('[data-debit-only]');
    const creditFields = form.querySelector('[data-credit-only]');
    if (debitFields) debitFields.hidden = !debit;
    if (creditFields) creditFields.hidden = debit;
  }

  function toggleSavings(form) {
    const kind = form.elements.namedItem('productKind');
    const maturity = form.elements.namedItem('maturityDate');
    if (!kind || !maturity) return;
    const housing = kind.value === 'housing';
    maturity.required = !housing;
    const label = maturity.closest('label');
    const text = label && [...label.childNodes].find((node) => node.nodeType === 3);
    if (text) text.textContent = housing ? '만기일 (선택)' : '만기일';
  }

  function toggleStock(form) {
    const currency = form.elements.namedItem('currency');
    const fx = form.elements.namedItem('purchaseFx');
    const box = form.querySelector('[data-fx-only]');
    if (!currency || !fx || !box) return;
    const usd = currency.value === 'USD';
    box.hidden = !usd;
    fx.required = usd;
    fx.disabled = !usd;
    if (usd && !fx.value && fx.dataset.todayRate) fx.value = fx.dataset.todayRate;
  }

  function openDialog(type, id) {
    const config = types[type];
    const dialog = document.getElementById(config.dialogId);
    const form = dialog.querySelector('[data-editor]');
    const mode = dialog.querySelector('[data-mode]');
    const deleteForm = dialog.querySelector('[data-delete-form]');
    form.reset();

    if (id) {
      const values = records[type][id];
      if (!values) return;
      fill(form, values);
      form.action = config.update.replace(':id', encodeURIComponent(id));
      mode.textContent = '수정';
      if (deleteForm) {
        deleteForm.hidden = false;
        deleteForm.action = config.remove.replace(':id', encodeURIComponent(id));
      }
    } else {
      form.action = config.create;
      mode.textContent = '등록';
      if (deleteForm) deleteForm.hidden = true;
      if (form.elements.namedItem('kind')) form.elements.kind.value = 'checking';
      if (form.elements.namedItem('currency')) form.elements.currency.value = 'KRW';
      if (form.elements.namedItem('type')) form.elements.type.value = 'credit';
      if (form.elements.namedItem('productKind')) form.elements.productKind.value = 'installment';
    }

    toggleCard(form);
    toggleSavings(form);
    toggleStock(form);
    dialog.showModal();
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-asset-action]');
    if (opener) {
      const id = opener.dataset.assetAction === 'edit' ? opener.dataset.assetId : null;
      openDialog(opener.dataset.assetType, id);
      return;
    }
    const closer = event.target.closest('[data-close-dialog]');
    if (closer) closer.closest('dialog')?.close();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-confirm')) return;
    const label = form.getAttribute('data-confirm') || '이 항목';
    if (!window.confirm(`${label} 항목을 삭제할까요?`)) event.preventDefault();
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    const typeField = dialog.querySelector('[name="type"]');
    if (typeField) {
      typeField.addEventListener('change', () => toggleCard(typeField.form));
    }
    const kindField = dialog.querySelector('[name="productKind"]');
    if (kindField) {
      kindField.addEventListener('change', () => toggleSavings(kindField.form));
    }
    const currencyField = dialog.querySelector('[name="currency"]');
    if (currencyField) {
      currencyField.addEventListener('change', () => toggleStock(currencyField.form));
    }
  });
})();
