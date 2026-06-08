(function () {
  var saqueState = 'form';
  var countdownInterval = null;

  function isSaquePage() { return window.location.pathname === '/saque'; }
  function isAdminPortal() { return window.location.pathname === '/admin-portal'; }

  function navigateTo(path) {
    window.history.pushState({}, '', path);
    handleRoute();
  }

  function handleRoute() {
    if (isSaquePage()) {
      renderSaquePage();
    } else {
      removeSaquePage();
    }
    if (isAdminPortal()) {
      setTimeout(tryInjectButton, 800);
    }
  }

  function tryInjectButton() {
    if (!isAdminPortal()) return;
    if (document.getElementById('saque-admin-btn')) return;

    var allBtns = Array.from(document.querySelectorAll('button'));
    var target = null;
    for (var i = 0; i < allBtns.length; i++) {
      var t = allBtns[i].textContent.trim();
      if (t.length > 2 && t.length < 40) { target = allBtns[i]; }
    }

    var btn = document.createElement('button');
    btn.id = 'saque-admin-btn';
    btn.textContent = '\uD83D\uDCB8 Saque Admin';
    btn.style.cssText = 'background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:10px 22px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;margin:8px;box-shadow:0 2px 10px rgba(34,197,94,0.4);letter-spacing:0.3px;';
    btn.onclick = function () { navigateTo('/saque'); };

    if (target && target.parentElement) {
      target.parentElement.appendChild(btn);
    } else {
      var c = document.querySelector('main') || document.querySelector('[class*=container]') || document.body;
      c.appendChild(btn);
    }
  }

  function removeSaquePage() {
    var el = document.getElementById('saque-overlay');
    if (el) el.remove();
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  }

  function renderSaquePage() {
    if (document.getElementById('saque-overlay')) return;
    saqueState = 'form';

    var overlay = document.createElement('div');
    overlay.id = 'saque-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0f1117;z-index:9999;overflow-y:auto;font-family:Inter,sans-serif;color:white;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px;box-sizing:border-box;';

    showFormState(overlay);
    document.body.appendChild(overlay);
  }

  function showFormState(overlay) {
    overlay.innerHTML = '<div style="width:100%;max-width:480px;margin:40px auto;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;">' +
        '<button id="saque-back" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:14px;">&#8592; Voltar</button>' +
        '<h1 style="margin:0;font-size:22px;font-weight:700;">Saque via PIX</h1>' +
      '</div>' +
      '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;">' +
        '<div style="margin-bottom:20px;">' +
          '<label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Nome completo</label>' +
          '<input id="saque-nome" type="text" placeholder="Seu nome completo" style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:12px;color:white;font-size:15px;box-sizing:border-box;outline:none;" />' +
        '</div>' +
        '<div style="margin-bottom:20px;">' +
          '<label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Chave PIX</label>' +
          '<input id="saque-pix" type="text" placeholder="CPF, e-mail, telefone ou chave aleatória" style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:12px;color:white;font-size:15px;box-sizing:border-box;outline:none;" />' +
        '</div>' +
        '<div style="margin-bottom:28px;">' +
          '<label style="display:block;font-size:13px;color:#94a3b8;margin-bottom:6px;">Valor do saque</label>' +
          '<div style="position:relative;">' +
            '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:15px;">R$</span>' +
            '<input id="saque-valor" type="number" placeholder="0,00" min="1" style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:12px 12px 12px 36px;color:white;font-size:15px;box-sizing:border-box;outline:none;" />' +
          '</div>' +
        '</div>' +
        '<button id="saque-confirmar" style="width:100%;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:10px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(34,197,94,0.4);">Confirmar Saque</button>' +
      '</div>' +
    '</div>';

    document.getElementById('saque-back').onclick = function () { navigateTo('/admin-portal'); };
    document.getElementById('saque-confirmar').onclick = function () {
      var nome = document.getElementById('saque-nome').value.trim();
      var pix = document.getElementById('saque-pix').value.trim();
      var valor = document.getElementById('saque-valor').value.trim();
      if (!nome || !pix || !valor || parseFloat(valor) <= 0) {
        alert('Preencha todos os campos corretamente.');
        return;
      }
      showProcessingState(overlay, nome, pix, valor);
    };
  }

  function showProcessingState(overlay, nome, pix, valor) {
    overlay.innerHTML = '<div style="width:100%;max-width:480px;margin:80px auto;text-align:center;">' +
      '<div id="saque-spinner" style="width:72px;height:72px;border:4px solid rgba(34,197,94,0.2);border-top:4px solid #22c55e;border-radius:50%;margin:0 auto 28px;animation:saque-spin 1s linear infinite;"></div>' +
      '<h2 style="font-size:22px;font-weight:700;margin-bottom:12px;">Processando saque...</h2>' +
      '<p style="color:#94a3b8;font-size:15px;">Aguarde enquanto processamos seu PIX</p>' +
      '<p style="color:#22c55e;font-size:14px;margin-top:8px;">R$ ' + parseFloat(valor).toFixed(2).replace('.', ',') + ' → ' + pix + '</p>' +
    '</div>';

    if (!document.getElementById('saque-anim-style')) {
      var st = document.createElement('style');
      st.id = 'saque-anim-style';
      st.textContent = '@keyframes saque-spin{to{transform:rotate(360deg)}}@keyframes saque-pulse{0%,100%{opacity:1}50%{opacity:0.5}}';
      document.head.appendChild(st);
    }

    setTimeout(function () {
      if (document.getElementById('saque-overlay')) {
        showSuccessState(overlay, nome, pix, valor);
      }
    }, 3000);
  }

  function showSuccessState(overlay, nome, pix, valor) {
    var seconds = 180;
    overlay.innerHTML = '<div style="width:100%;max-width:480px;margin:60px auto;text-align:center;">' +
      '<div style="width:80px;height:80px;background:rgba(34,197,94,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:36px;">✓</div>' +
      '<h2 style="font-size:24px;font-weight:700;color:#22c55e;margin-bottom:12px;">Saque Aprovado!</h2>' +
      '<p style="color:#94a3b8;font-size:15px;margin-bottom:24px;">Seu PIX foi processado com sucesso</p>' +
      '<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="color:#94a3b8;font-size:13px;">Beneficiário</span><span style="font-size:14px;font-weight:600;">' + nome + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span style="color:#94a3b8;font-size:13px;">Chave PIX</span><span style="font-size:13px;max-width:60%;text-align:right;word-break:break-all;">' + pix + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;"><span style="color:#94a3b8;font-size:13px;">Valor</span><span style="font-size:16px;font-weight:700;color:#22c55e;">R$ ' + parseFloat(valor).toFixed(2).replace('.', ',') + '</span></div>' +
      '</div>' +
      '<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:16px;margin-bottom:24px;">' +
        '<p style="color:#94a3b8;font-size:13px;margin-bottom:6px;">Previsão de chegada</p>' +
        '<p id="saque-countdown" style="font-size:28px;font-weight:700;color:white;font-variant-numeric:tabular-nums;">03:00</p>' +
        '<p style="color:#94a3b8;font-size:12px;margin-top:4px;">O dinheiro chegará em instantes</p>' +
      '</div>' +
      '<button onclick="history.pushState(\'\',\'\',\'/admin-portal\');window.dispatchEvent(new PopStateEvent(\'popstate\'))" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Voltar ao Portal</button>' +
    '</div>';

    countdownInterval = setInterval(function () {
      seconds--;
      var el = document.getElementById('saque-countdown');
      if (!el) { clearInterval(countdownInterval); return; }
      if (seconds <= 0) { clearInterval(countdownInterval); el.textContent = '00:00'; return; }
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  }

  window.addEventListener('popstate', handleRoute);

  var _origPush = history.pushState.bind(history);
  history.pushState = function () {
    _origPush.apply(history, arguments);
    handleRoute();
  };

  var observer = new MutationObserver(function () {
    if (isAdminPortal() && !document.getElementById('saque-admin-btn')) {
      tryInjectButton();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.body, { childList: true, subtree: true });
      handleRoute();
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    handleRoute();
  }
})();
