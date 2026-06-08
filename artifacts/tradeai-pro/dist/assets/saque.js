(function () {
    var selectedMethod = 'pix';
    var countdownInterval = null;

    /* ── utilitários ── */
    function isAdminPortal() { return window.location.pathname === '/admin-portal'; }

    function openSaque() {
      injectStyles();
      if (document.getElementById('saque-overlay')) return;
      renderSaquePage();
    }

    function closeSaque() {
      var el = document.getElementById('saque-overlay');
      if (el) el.remove();
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      selectedMethod = 'pix';
    }

    /* ── injeção do botão no Admin Portal ── */
    function tryInjectButton() {
      if (!isAdminPortal()) return;
      if (document.getElementById('saque-admin-btn')) return;

      var btn = document.createElement('button');
      btn.id = 'saque-admin-btn';
      btn.type = 'button';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>Saque';
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
        'letter-spacing:0.2px',
        'transition:background 0.2s',
        'font-family:inherit',
      ].join(';');
      btn.onmouseenter = function() { btn.style.background = 'rgba(34,197,94,0.28)'; };
      btn.onmouseleave = function() { btn.style.background = 'rgba(34,197,94,0.15)'; };
      btn.onclick = function(e) { e.stopPropagation(); openSaque(); };

      /* inserir ao lado do botão Sair */
      var allBtns = Array.from(document.querySelectorAll('button'));
      var logoutBtn = allBtns.find(function(b) {
        var t = b.textContent.trim().toLowerCase();
        return t.includes('sair') || t.includes('logout') || t.includes('deslogar');
      });

      if (logoutBtn && logoutBtn.parentElement) {
        logoutBtn.parentElement.insertBefore(btn, logoutBtn);
      } else {
        /* fallback: header da página */
        var h1 = document.querySelector('h1');
        var container = h1 ? h1.closest('div') : null;
        var flexDiv = container ? (container.querySelector('div') || container) : document.body;
        flexDiv.appendChild(btn);
      }
    }

    /* ── estilos globais do overlay ── */
    function injectStyles() {
      if (document.getElementById('saque-styles')) return;
      var style = document.createElement('style');
      style.id = 'saque-styles';
      style.textContent = [
        '@keyframes sq-spin{to{transform:rotate(360deg)}}',
        '@keyframes sq-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes sq-ping{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.1)}}',
        '@keyframes sq-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
        '#saque-overlay *{box-sizing:border-box;font-family:Inter,Sora,system-ui,sans-serif}',
        '#saque-overlay input{outline:none}',
        '#saque-overlay input:focus{border-color:rgba(59,130,246,.65)!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)}',
        '.sq-method{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .18s;color:white;font-size:12px;font-weight:600}',
        '.sq-method.active{border-color:rgba(59,130,246,.6);background:rgba(59,130,246,.13)}',
        '.sq-method:hover{background:rgba(255,255,255,.1)}',
        '.sq-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.9px;margin-bottom:7px}',
        '.sq-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px 14px;color:white;font-size:14px;transition:border-color .18s}',
        '.sq-btn-green{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;box-shadow:0 4px 20px rgba(34,197,94,.35);transition:opacity .2s;letter-spacing:.2px}',
        '.sq-btn-green:hover{opacity:.9}',
        '.sq-btn-back{width:100%;padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.7);font-size:14px;font-weight:600;cursor:pointer;transition:background .18s}',
        '.sq-btn-back:hover{background:rgba(255,255,255,.1)}',
      ].join('');
      document.head.appendChild(style);
    }

    /* ── overlay principal ── */
    function renderSaquePage() {
      var overlay = document.createElement('div');
      overlay.id = 'saque-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a0f23 0%,#0d1a35 50%,#0a1220 100%);z-index:99999;overflow-y:auto;animation:sq-in .28s ease both;';
      document.body.appendChild(overlay);
      showForm(overlay);
    }

    /* ── tela: formulário ── */
    function showForm(overlay) {
      /* tentar ler saldo do localStorage */
      var balance = null;
      try {
        var allVals = Object.values(localStorage).map(function(v){ try{ return JSON.parse(v); }catch(e){ return null; } }).filter(Boolean);
        for (var i = 0; i < allVals.length; i++) {
          var d = allVals[i];
          if (d && d.real && d.real.balance != null) { balance = parseFloat(d.real.balance); break; }
          if (d && d.realBalance != null) { balance = parseFloat(d.realBalance); break; }
        }
      } catch(e){}
      var balStr = balance != null && !isNaN(balance)
        ? 'R$ ' + balance.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
        : 'R$ —';
      var maxStr = balance != null && !isNaN(balance)
        ? 'Máximo disponível: R$ ' + balance.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
        : 'Máximo disponível: consulte seu saldo';

      overlay.innerHTML = '<div style="max-width:680px;margin:0 auto;padding:24px 16px 60px;">' +

        /* header */
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            '<button id="sq-back" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.7);width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;">&#8592;</button>' +
            '<div>' +
              '<h1 style="margin:0;font-size:21px;font-weight:700;color:white;font-family:Sora,sans-serif;">Saque</h1>' +
              '<p style="margin:2px 0 0;font-size:13px;color:rgba(255,255,255,.4);">Retire seus ganhos de forma segura e rápida</p>' +
            '</div>' +
          '</div>' +
          '<span style="background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.3);padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.7px;">&#10003; DESBLOQUEADO</span>' +
        '</div>' +

        /* conta real tag */
        '<div style="margin-bottom:16px;"><span style="padding:7px 16px;border-radius:9px;font-weight:700;font-size:13px;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:white;">Conta Real</span></div>' +

        /* saldo */
        '<div style="border-radius:18px;padding:22px 24px;border:1px solid rgba(59,130,246,.2);background:linear-gradient(135deg,rgba(59,130,246,.1) 0%,rgba(6,182,212,.05) 100%);display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
          '<div>' +
            '<p style="margin:0 0 5px;font-size:12px;color:rgba(255,255,255,.55);">Saldo Disponível</p>' +
            '<p style="margin:0;font-size:28px;font-weight:700;color:white;font-family:Sora,sans-serif;">' + balStr + '</p>' +
          '</div>' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:rgba(59,130,246,.3);" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>' +
        '</div>' +

        /* valor */
        '<div style="margin-bottom:16px;">' +
          '<label class="sq-label">Valor do Saque (R$)</label>' +
          '<input id="sq-valor" class="sq-input" type="number" inputmode="decimal" placeholder="Ex: 500.00" min="1" step="0.01"/>' +
          '<p id="sq-max" style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.35);">' + maxStr + '</p>' +
        '</div>' +

        /* método */
        '<div style="margin-bottom:16px;">' +
          '<label class="sq-label">Método de Saque</label>' +
          '<div style="display:flex;gap:10px;">' +
            '<button class="sq-method active" id="sq-pix-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9"/></svg>PIX</button>' +
            '<button class="sq-method" id="sq-ted-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>TED / DOC</button>' +
          '</div>' +
        '</div>' +

        /* chave pix */
        '<div id="sq-pix-sec" style="margin-bottom:16px;">' +
          '<label class="sq-label">Chave PIX</label>' +
          '<input id="sq-pix" class="sq-input" type="text" placeholder="CPF, Email, Telefone ou Chave Aleatória"/>' +
        '</div>' +

        /* conta TED (oculto) */
        '<div id="sq-ted-sec" style="display:none;margin-bottom:16px;">' +
          '<label class="sq-label">Conta Bancária</label>' +
          '<input id="sq-ted" class="sq-input" type="text" placeholder="0000000000-00 (Agência-Conta)"/>' +
        '</div>' +

        /* botão confirmar */
        '<button class="sq-btn-green" id="sq-confirmar" style="margin-bottom:14px;">Sacar R$ 0,00</button>' +

        /* info */
        '<div style="border-radius:12px;padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);font-size:12px;color:rgba(255,255,255,.45);line-height:1.8;">' +
          '<p style="margin:0 0 2px;"><strong style="color:rgba(255,255,255,.65);">Tempo de processamento:</strong> PIX (até 1 hora), TED/DOC (até 2 dias úteis)</p>' +
          '<p style="margin:0;"><strong style="color:rgba(255,255,255,.65);">Taxa:</strong> Sem taxa de saque para contas verificadas</p>' +
        '</div>' +

      '</div>';

      /* eventos */
      document.getElementById('sq-back').onclick = function() { closeSaque(); };

      document.getElementById('sq-pix-btn').onclick = function() {
        selectedMethod = 'pix';
        document.getElementById('sq-pix-btn').classList.add('active');
        document.getElementById('sq-ted-btn').classList.remove('active');
        document.getElementById('sq-pix-sec').style.display = '';
        document.getElementById('sq-ted-sec').style.display = 'none';
        updateBtn();
      };
      document.getElementById('sq-ted-btn').onclick = function() {
        selectedMethod = 'ted';
        document.getElementById('sq-ted-btn').classList.add('active');
        document.getElementById('sq-pix-btn').classList.remove('active');
        document.getElementById('sq-ted-sec').style.display = '';
        document.getElementById('sq-pix-sec').style.display = 'none';
        updateBtn();
      };
      document.getElementById('sq-valor').addEventListener('input', updateBtn);

      function updateBtn() {
        var val = parseFloat(document.getElementById('sq-valor').value) || 0;
        var btn = document.getElementById('sq-confirmar');
        btn.textContent = val > 0
          ? 'Sacar R$ ' + val.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
          : 'Sacar R$ 0,00';
      }

      document.getElementById('sq-confirmar').onclick = function() {
        var valor = parseFloat(document.getElementById('sq-valor').value);
        var pix   = selectedMethod === 'pix' ? (document.getElementById('sq-pix').value || '').trim() : '';
        var ted   = selectedMethod === 'ted' ? (document.getElementById('sq-ted').value || '').trim() : '';
        if (!valor || valor <= 0) { highlight('sq-valor'); return; }
        if (selectedMethod === 'pix' && !pix) { highlight('sq-pix'); return; }
        if (selectedMethod === 'ted' && !ted) { highlight('sq-ted'); return; }
        showProcessing(overlay, valor, selectedMethod === 'pix' ? pix : ted);
      };
    }

    function highlight(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.borderColor = '#ef4444';
      el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
      el.focus();
      setTimeout(function() { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2000);
    }

    /* ── tela: processando ── */
    function showProcessing(overlay, valor, dest) {
      overlay.innerHTML = '<div style="max-width:440px;margin:90px auto;padding:24px;text-align:center;">' +
        '<div style="position:relative;width:84px;height:84px;margin:0 auto 26px;">' +
          '<div style="position:absolute;inset:0;border-radius:50%;border:3px solid rgba(59,130,246,.15);"></div>' +
          '<div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#3b82f6;animation:sq-spin .85s linear infinite;"></div>' +
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9"/></svg>' +
          '</div>' +
        '</div>' +
        '<h2 style="margin:0 0 10px;font-size:21px;font-weight:700;color:white;font-family:Sora,sans-serif;">Processando Saque</h2>' +
        '<p style="margin:0 0 26px;color:rgba(255,255,255,.45);font-size:14px;">Aguarde enquanto validamos sua solicitação...</p>' +
        '<div style="width:100%;height:4px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin-bottom:22px;">' +
          '<div style="height:100%;width:60%;background:linear-gradient(90deg,#3b82f6,#06b6d4);border-radius:99px;animation:sq-pulse 1.3s ease-in-out infinite;"></div>' +
        '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.35);line-height:2.1;">' +
          '<p style="margin:0;">&#10003; Autenticando credenciais</p>' +
          '<p style="margin:0;">&#10003; Verificando saldo disponível</p>' +
          '<p style="margin:0;color:rgba(96,165,250,.8);animation:sq-pulse 1.2s ease-in-out infinite;">&#8635; Processando transação ' + (selectedMethod === 'pix' ? 'PIX' : 'TED') + '...</p>' +
        '</div>' +
      '</div>';

      setTimeout(function() {
        if (document.getElementById('saque-overlay')) showSuccess(overlay, valor, dest);
      }, 3200);
    }

    /* ── tela: sucesso ── */
    function showSuccess(overlay, valor, dest) {
      var isPix   = selectedMethod === 'pix';
      var etaLabel= isPix ? 'até 1 hora' : 'até 2 dias úteis';
      var proto   = 'TRD-' + Math.random().toString(36).substring(2,10).toUpperCase();
      var now     = new Date().toLocaleString('pt-BR');
      var secs    = isPix ? 900 : 7200;
      function fmt(s){ var m=Math.floor(s/60),r=s%60; return (m<10?'0':'')+m+':'+(r<10?'0':'')+r; }

      overlay.innerHTML = '<div style="max-width:460px;margin:50px auto;padding:24px;">' +

        /* ícone */
        '<div style="text-align:center;margin-bottom:22px;">' +
          '<div style="position:relative;width:96px;height:96px;margin:0 auto;">' +
            '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,.08);animation:sq-ping 2s ease-in-out infinite;"></div>' +
            '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,.16);display:flex;align-items:center;justify-content:center;">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* card */
        '<div style="border-radius:20px;padding:22px;border:1px solid rgba(34,197,94,.3);background:linear-gradient(135deg,rgba(34,197,94,.1) 0%,rgba(15,25,50,.95) 100%);box-shadow:0 0 40px rgba(34,197,94,.07);text-align:center;margin-bottom:14px;">' +
          '<p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:2px;">Saque Aprovado</p>' +
          '<p style="margin:0 0 4px;font-size:36px;font-weight:700;color:white;font-family:Sora,sans-serif;">R$ ' + valor.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) + '</p>' +
          '<p style="margin:0 0 18px;font-size:13px;color:rgba(255,255,255,.4);">Solicitação confirmada com sucesso</p>' +

          '<div style="background:rgba(255,255,255,.05);border-radius:11px;padding:11px 14px;text-align:left;margin-bottom:14px;">' +
            '<p style="margin:0 0 3px;font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;">' + (isPix ? 'Chave PIX de Destino' : 'Conta Bancária') + '</p>' +
            '<p style="margin:0;font-size:13px;color:white;font-family:monospace;word-break:break-all;">' + dest + '</p>' +
          '</div>' +

          '<div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:11px;padding:13px 14px;display:flex;align-items:center;gap:11px;text-align:left;margin-bottom:14px;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            '<div>' +
              '<p style="margin:0 0 2px;font-size:13px;font-weight:600;color:white;">Você receberá o ' + (isPix ? 'PIX' : 'TED') + ' em <span style="color:#60a5fa;">' + etaLabel + '</span></p>' +
              '<p style="margin:0;font-size:11px;color:rgba(255,255,255,.4);">Tempo estimado: <span id="sq-cd" style="font-family:monospace;color:#93c5fd;">' + fmt(secs) + '</span></p>' +
            '</div>' +
          '</div>' +

          '<div style="font-size:11px;color:rgba(255,255,255,.25);line-height:1.9;">' +
            '<p style="margin:0;">Protocolo: ' + proto + '</p>' +
            '<p style="margin:0;">Data/Hora: ' + now + '</p>' +
            '<p style="margin:0;">Status: <span style="color:#4ade80;font-weight:700;">APROVADO</span></p>' +
          '</div>' +
        '</div>' +

        '<button class="sq-btn-back" id="sq-done">&#8592; Voltar ao Admin Portal</button>' +
      '</div>';

      /* countdown */
      countdownInterval = setInterval(function() {
        secs--;
        var el = document.getElementById('sq-cd');
        if (!el) { clearInterval(countdownInterval); return; }
        if (secs <= 0) { clearInterval(countdownInterval); el.textContent = '00:00'; return; }
        el.textContent = fmt(secs);
      }, 1000);

      document.getElementById('sq-done').onclick = function() { closeSaque(); };
    }

    /* ── MutationObserver: reinjetar botão se o DOM mudar ── */
    var observer = new MutationObserver(function() {
      if (isAdminPortal() && !document.getElementById('saque-admin-btn')) {
        setTimeout(tryInjectButton, 400);
      }
    });

    function init() {
      observer.observe(document.body, { childList: true, subtree: true });
      if (isAdminPortal()) setTimeout(tryInjectButton, 900);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
  