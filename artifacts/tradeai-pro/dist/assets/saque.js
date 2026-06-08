(function () {
    var saqueState = 'form';
    var countdownInterval = null;
    var selectedMethod = 'pix';

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

      var btn = document.createElement('a');
      btn.id = 'saque-admin-btn';
      btn.href = '/saque';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>Saque';
      btn.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'background:rgba(34,197,94,0.15)',
        'color:#4ade80',
        'border:1px solid rgba(34,197,94,0.35)',
        'padding:8px 18px',
        'border-radius:8px',
        'cursor:pointer',
        'font-size:13px',
        'font-weight:700',
        'margin-right:8px',
        'text-decoration:none',
        'letter-spacing:0.2px',
        'transition:background 0.2s',
        'font-family:inherit',
      ].join(';');
      btn.onmouseenter = function() { btn.style.background = 'rgba(34,197,94,0.25)'; };
      btn.onmouseleave = function() { btn.style.background = 'rgba(34,197,94,0.15)'; };
      btn.onclick = function(e) { e.preventDefault(); navigateTo('/saque'); };

      // Tentar inserir ao lado do botão "Sair"
      var allBtns = Array.from(document.querySelectorAll('button'));
      var logoutBtn = allBtns.find(function(b) { return b.textContent.trim().toLowerCase().includes('sair') || b.textContent.trim().toLowerCase().includes('logout'); });

      if (logoutBtn && logoutBtn.parentElement) {
        logoutBtn.parentElement.insertBefore(btn, logoutBtn);
      } else {
        // Fallback: inserir no primeiro flex container do header
        var header = document.querySelector('h1');
        if (header) {
          var parent = header.closest('div');
          if (parent) { var flexDiv = parent.querySelector('div[class*="flex"]') || parent; flexDiv.insertBefore(btn, flexDiv.firstChild); }
          else { document.body.appendChild(btn); }
        } else {
          document.body.appendChild(btn);
        }
      }
    }

    function removeSaquePage() {
      var el = document.getElementById('saque-overlay');
      if (el) el.remove();
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      saqueState = 'form';
      selectedMethod = 'pix';
    }

    function injectStyles() {
      if (document.getElementById('saque-styles')) return;
      var style = document.createElement('style');
      style.id = 'saque-styles';
      style.textContent = [
        '@keyframes saque-spin{to{transform:rotate(360deg)}}',
        '@keyframes saque-fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes saque-ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.08)}}',
        '@keyframes saque-pulse{0%,100%{opacity:1}50%{opacity:0.4}}',
        '#saque-overlay *{box-sizing:border-box;font-family:Inter,Sora,system-ui,sans-serif}',
        '#saque-overlay input{outline:none}',
        '#saque-overlay input:focus{border-color:rgba(59,130,246,0.6)!important;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}',
        '.saque-method-btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);cursor:pointer;flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all 0.18s;color:white;font-size:12px;font-weight:600}',
        '.saque-method-btn.active{border-color:rgba(59,130,246,0.6);background:rgba(59,130,246,0.12)}',
        '.saque-method-btn:hover{background:rgba(255,255,255,0.1)}',
        '.saque-btn-primary{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;box-shadow:0 4px 20px rgba(34,197,94,0.35);transition:opacity 0.2s;letter-spacing:0.2px}',
        '.saque-btn-primary:hover{opacity:0.9}',
        '.saque-btn-primary:disabled{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);cursor:not-allowed;box-shadow:none}',
        '.saque-input{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:11px 14px;color:white;font-size:14px;transition:border-color 0.18s}',
        '.saque-label{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px}',
      ].join('');
      document.head.appendChild(style);
    }

    function renderSaquePage() {
      if (document.getElementById('saque-overlay')) return;
      saqueState = 'form';
      selectedMethod = 'pix';
      injectStyles();

      var overlay = document.createElement('div');
      overlay.id = 'saque-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a0f23 0%,#0d1a35 50%,#0a1220 100%);z-index:9999;overflow-y:auto;';
      document.body.appendChild(overlay);

      showFormState(overlay);
    }

    function showFormState(overlay) {
      overlay.innerHTML = '';
      overlay.style.animation = 'saque-fadeIn 0.3s ease both';

      var html = '<div style="max-width:720px;margin:0 auto;padding:24px 16px 60px;">' +

        // Header
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            '<button id="saque-back-btn" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);width:36px;height:36px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:background 0.18s;">&#8592;</button>' +
            '<div>' +
              '<h1 style="margin:0;font-size:22px;font-weight:700;color:white;font-family:Sora,Inter,sans-serif;">Saque</h1>' +
              '<p style="margin:2px 0 0;font-size:13px;color:rgba(255,255,255,0.4);">Retire seus ganhos de forma segura e rápida</p>' +
            '</div>' +
          '</div>' +
          '<span style="background:rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.3);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.6px;">&#10003; DESBLOQUEADO</span>' +
        '</div>' +

        // Account tab
        '<div style="margin-bottom:16px;">' +
          '<button style="padding:8px 18px;border-radius:10px;font-weight:700;font-size:13px;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:white;border:none;cursor:default;">Conta Real</button>' +
        '</div>' +

        // Grid
        '<div style="display:grid;grid-template-columns:1fr;gap:16px;">' +

          // Balance card
          '<div style="border-radius:20px;padding:24px;border:1px solid rgba(59,130,246,0.2);background:linear-gradient(135deg,rgba(59,130,246,0.1) 0%,rgba(6,182,212,0.05) 100%);display:flex;align-items:center;justify-content:space-between;">' +
            '<div>' +
              '<p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.55);">Saldo Disponível</p>' +
              '<p style="margin:0;font-size:30px;font-weight:700;color:white;font-family:Sora,sans-serif;" id="saque-balance-display">Carregando...</p>' +
            '</div>' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:rgba(59,130,246,0.3);" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>' +
          '</div>' +

          // Amount input
          '<div>' +
            '<label class="saque-label">Valor do Saque (R$)</label>' +
            '<input id="saque-valor" class="saque-input" type="number" inputmode="decimal" placeholder="Ex: 500.00" min="1" step="0.01" />' +
            '<p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.35);" id="saque-max-label">Máximo disponível: —</p>' +
          '</div>' +

          // Method selection
          '<div>' +
            '<label class="saque-label">Método de Saque</label>' +
            '<div style="display:flex;gap:10px;">' +
              '<button class="saque-method-btn active" id="saque-pix-btn">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9"/></svg>' +
                'PIX' +
              '</button>' +
              '<button class="saque-method-btn" id="saque-ted-btn">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>' +
                'TED / DOC' +
              '</button>' +
            '</div>' +
          '</div>' +

          // PIX key input
          '<div id="saque-pix-section">' +
            '<label class="saque-label">Chave PIX</label>' +
            '<input id="saque-pix" class="saque-input" type="text" placeholder="CPF, Email, Telefone ou Chave Aleatória" />' +
          '</div>' +

          // TED input (hidden initially)
          '<div id="saque-ted-section" style="display:none;">' +
            '<label class="saque-label">Conta Bancária</label>' +
            '<input id="saque-ted" class="saque-input" type="text" placeholder="0000000000-00 (Agência-Conta)" />' +
          '</div>' +

          // Submit button
          '<button class="saque-btn-primary" id="saque-confirmar">Sacar R$ 0,00</button>' +

          // Info box
          '<div style="border-radius:14px;padding:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);font-size:12px;color:rgba(255,255,255,0.5);line-height:1.7;">' +
            '<p style="margin:0 0 4px;"><strong style="color:rgba(255,255,255,0.7);">Tempo de processamento:</strong> PIX (até 1 hora), TED/DOC (até 2 dias úteis)</p>' +
            '<p style="margin:0;"><strong style="color:rgba(255,255,255,0.7);">Taxa:</strong> Sem taxa de saque para contas verificadas</p>' +
          '</div>' +

        '</div>' + // end grid
      '</div>'; // end max-width

      overlay.innerHTML = html;

      // Try to read balance from the React app's localStorage/context
      var balanceDisplay = document.getElementById('saque-balance-display');
      var maxLabel = document.getElementById('saque-max-label');
      var detectedBalance = null;
      try {
        // Try to find balance from localStorage keys used by TradingContext
        var keys = Object.keys(localStorage);
        var tradingKey = keys.find(function(k) { return k.includes('trading') || k.includes('balance') || k.includes('account'); });
        if (tradingKey) {
          var stored = JSON.parse(localStorage.getItem(tradingKey));
          if (stored && stored.real && stored.real.balance != null) {
            detectedBalance = parseFloat(stored.real.balance);
          } else if (stored && stored.balance != null) {
            detectedBalance = parseFloat(stored.balance);
          }
        }
        if (detectedBalance == null) {
          // Try another common key pattern
          var allData = keys.map(function(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; }}).filter(Boolean);
          for (var i = 0; i < allData.length; i++) {
            var d = allData[i];
            if (d && d.real && d.real.balance != null) { detectedBalance = parseFloat(d.real.balance); break; }
          }
        }
      } catch(e) {}

      if (detectedBalance != null && !isNaN(detectedBalance)) {
        balanceDisplay.textContent = 'R$ ' + detectedBalance.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        maxLabel.textContent = 'Máximo disponível: R$ ' + detectedBalance.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      } else {
        balanceDisplay.textContent = 'R$ —';
        maxLabel.textContent = 'Máximo disponível: consulte seu saldo';
      }

      // Back button
      document.getElementById('saque-back-btn').onclick = function() { navigateTo('/admin-portal'); };

      // Method toggle
      document.getElementById('saque-pix-btn').onclick = function() {
        selectedMethod = 'pix';
        document.getElementById('saque-pix-btn').classList.add('active');
        document.getElementById('saque-ted-btn').classList.remove('active');
        document.getElementById('saque-pix-section').style.display = '';
        document.getElementById('saque-ted-section').style.display = 'none';
        updateSubmitBtn();
      };
      document.getElementById('saque-ted-btn').onclick = function() {
        selectedMethod = 'ted';
        document.getElementById('saque-ted-btn').classList.add('active');
        document.getElementById('saque-pix-btn').classList.remove('active');
        document.getElementById('saque-ted-section').style.display = '';
        document.getElementById('saque-pix-section').style.display = 'none';
        updateSubmitBtn();
      };

      // Amount input: update button label
      document.getElementById('saque-valor').addEventListener('input', updateSubmitBtn);

      function updateSubmitBtn() {
        var val = parseFloat(document.getElementById('saque-valor').value) || 0;
        var btn = document.getElementById('saque-confirmar');
        if (val > 0) {
          btn.textContent = 'Sacar R$ ' + val.toFixed(2).replace('.', ',');
          btn.disabled = false;
        } else {
          btn.textContent = 'Sacar R$ 0,00';
          btn.disabled = false;
        }
      }

      // Submit
      document.getElementById('saque-confirmar').onclick = function() {
        var valor = document.getElementById('saque-valor').value.trim();
        var pixKey = selectedMethod === 'pix' ? document.getElementById('saque-pix').value.trim() : '';
        var tedAcc = selectedMethod === 'ted' ? document.getElementById('saque-ted').value.trim() : '';

        if (!valor || parseFloat(valor) <= 0) {
          shakeBorder('saque-valor');
          return;
        }
        if (selectedMethod === 'pix' && !pixKey) {
          shakeBorder('saque-pix');
          return;
        }
        if (selectedMethod === 'ted' && !tedAcc) {
          shakeBorder('saque-ted');
          return;
        }

        var dest = selectedMethod === 'pix' ? pixKey : tedAcc;
        showProcessingState(overlay, parseFloat(valor), dest);
      };
    }

    function shakeBorder(inputId) {
      var el = document.getElementById(inputId);
      if (!el) return;
      el.style.borderColor = '#ef4444';
      el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
      setTimeout(function() {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }, 1800);
      el.focus();
    }

    function showProcessingState(overlay, valor, dest) {
      overlay.innerHTML = '<div style="width:100%;max-width:460px;margin:100px auto;padding:24px;text-align:center;">' +
        '<div style="position:relative;width:88px;height:88px;margin:0 auto 28px;">' +
          '<div style="position:absolute;inset:0;border-radius:50%;border:3px solid rgba(59,130,246,0.15);"></div>' +
          '<div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#3b82f6;animation:saque-spin 0.9s linear infinite;"></div>' +
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9"/></svg>' +
          '</div>' +
        '</div>' +
        '<h2 style="margin:0 0 10px;font-size:22px;font-weight:700;color:white;font-family:Sora,sans-serif;">Processando Saque</h2>' +
        '<p style="margin:0 0 28px;color:rgba(255,255,255,0.45);font-size:14px;">Aguarde enquanto validamos sua solicitação...</p>' +
        '<div style="width:100%;height:4px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden;margin-bottom:24px;">' +
          '<div style="height:100%;width:65%;background:linear-gradient(90deg,#3b82f6,#06b6d4);border-radius:99px;animation:saque-pulse 1.4s ease-in-out infinite;"></div>' +
        '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:2;">' +
          '<p style="margin:0;">&#10003; Autenticando credenciais</p>' +
          '<p style="margin:0;">&#10003; Verificando saldo disponível</p>' +
          '<p style="margin:0;color:rgba(96,165,250,0.8);animation:saque-pulse 1.2s ease-in-out infinite;">&#8635; Processando transação ' + (selectedMethod === 'pix' ? 'PIX' : 'TED') + '...</p>' +
        '</div>' +
      '</div>';

      setTimeout(function() {
        if (document.getElementById('saque-overlay')) {
          showSuccessState(overlay, valor, dest);
        }
      }, 3200);
    }

    function showSuccessState(overlay, valor, dest) {
      var isPix = selectedMethod === 'pix';
      var etaLabel = isPix ? 'até 1 hora' : 'até 2 dias úteis';
      var protocol = 'TRD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      var now = new Date().toLocaleString('pt-BR');
      var seconds = isPix ? 900 : 7200;

      overlay.innerHTML = '<div style="width:100%;max-width:460px;margin:60px auto;padding:24px;">' +

        // Success icon
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<div style="position:relative;width:100px;height:100px;margin:0 auto;">' +
            '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.08);animation:saque-ping 2s ease-in-out infinite;"></div>' +
            '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Main card
        '<div style="border-radius:20px;padding:24px;border:1px solid rgba(34,197,94,0.3);background:linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(15,25,50,0.95) 100%);box-shadow:0 0 40px rgba(34,197,94,0.08);text-align:center;margin-bottom:16px;">' +
          '<p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:2px;">Saque Aprovado</p>' +
          '<p style="margin:0 0 4px;font-size:38px;font-weight:700;color:white;font-family:Sora,sans-serif;">R$ ' + valor.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</p>' +
          '<p style="margin:0 0 20px;font-size:13px;color:rgba(255,255,255,0.45);">Solicitação confirmada com sucesso</p>' +

          // Destination
          '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px 16px;text-align:left;margin-bottom:16px;">' +
            '<p style="margin:0 0 4px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">' + (isPix ? 'Chave PIX de Destino' : 'Conta Bancária') + '</p>' +
            '<p style="margin:0;font-size:13px;color:white;font-family:monospace;word-break:break-all;">' + dest + '</p>' +
          '</div>' +

          // ETA with countdown
          '<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;text-align:left;margin-bottom:16px;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            '<div>' +
              '<p style="margin:0 0 2px;font-size:13px;font-weight:600;color:white;">Você receberá o ' + (isPix ? 'PIX' : 'TED') + ' em <span style="color:#60a5fa;">' + etaLabel + '</span></p>' +
              '<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">Tempo estimado: <span id="saque-countdown" style="font-family:monospace;color:#93c5fd;">--:--</span></p>' +
            '</div>' +
          '</div>' +

          // Protocol
          '<div style="font-size:11px;color:rgba(255,255,255,0.25);line-height:1.9;">' +
            '<p style="margin:0;">Protocolo: ' + protocol + '</p>' +
            '<p style="margin:0;">Data/Hora: ' + now + '</p>' +
            '<p style="margin:0;">Status: <span style="color:#4ade80;font-weight:700;">APROVADO</span></p>' +
          '</div>' +
        '</div>' +

        // Back button
        '<button id="saque-success-back" style="width:100%;padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.18s;">&#8592; Voltar ao Admin Portal</button>' +
      '</div>';

      // Countdown
      var countEl = document.getElementById('saque-countdown');
      if (countEl) {
        function fmt(s) { var m = Math.floor(s/60); var sec = s%60; return (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec; }
        countEl.textContent = fmt(seconds);
        countdownInterval = setInterval(function() {
          seconds--;
          var el = document.getElementById('saque-countdown');
          if (!el) { clearInterval(countdownInterval); return; }
          if (seconds <= 0) { clearInterval(countdownInterval); el.textContent = '00:00'; return; }
          el.textContent = fmt(seconds);
        }, 1000);
      }

      document.getElementById('saque-success-back').onclick = function() { navigateTo('/admin-portal'); };
      document.getElementById('saque-success-back').onmouseenter = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
      document.getElementById('saque-success-back').onmouseleave = function() { this.style.background = 'rgba(255,255,255,0.05)'; };
    }

    // Route listeners
    window.addEventListener('popstate', handleRoute);

    var _origPush = history.pushState.bind(history);
    history.pushState = function() {
      _origPush.apply(history, arguments);
      handleRoute();
    };

    // MutationObserver para reinjetar botão se o DOM mudar
    var observer = new MutationObserver(function() {
      if (isAdminPortal() && !document.getElementById('saque-admin-btn')) {
        tryInjectButton();
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
        handleRoute();
      });
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
      handleRoute();
    }
  })();
  