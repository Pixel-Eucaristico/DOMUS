/**
 * Scripts JavaScript injetados no WebView para extração de dados SEFAZ SP NFC-e.
 *
 * Todas as funções retornam strings puras — sem dependências React.
 * O protocolo de extração é em duas fases:
 *  - Fase 1 (buildCaptureScript): ConsultaResumida → extrai produtos, navega para ConsultaCompleta
 *  - Fase 2 (buildPhase2Script): ConsultaCompleta → extrai EAN/NCM de table.toggable
 */

/**
 * Preenche automaticamente o campo de chave de acesso na página ConsultaPublica do SEFAZ SP.
 * Dispara três vezes para lidar com a hidratação dinâmica do ASP.NET.
 */
export function buildAutoFillScript(chaveAcesso: string): string {
  if (!chaveAcesso) return "true;";
  const safeChave = chaveAcesso.replace(/\D/g, "").substring(0, 44);
  return `
    (function() {
      function _tryFill() {
        var input = document.getElementById('Conteudo_txtChaveAcesso');
        if (input) {
          input.value = '${safeChave}';
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      _tryFill();
      setTimeout(_tryFill, 800);
      setTimeout(_tryFill, 2000);
    })();
    true;
  `;
}

/**
 * Script Fase 1: extrai produtos, total, emitente e chave da página ConsultaResumida.
 * Se a página já for ConsultaCompleta (com table.toggable), extrai EAN/NCM diretamente.
 * Se for ConsultaResumida, clica no botão "Visualizar em Abas" e envia PHASE1_NAVIGATING
 * para que o React injete o script Fase 2 no onLoadEnd da próxima página.
 *
 * Mensagens postadas via window.ReactNativeWebView.postMessage:
 *  - CAPTURE_JSON: dados completos (quando já na ConsultaCompleta)
 *  - PHASE1_NAVIGATING: dados Fase 1 + sinaliza navegação pendente
 *  - NAVIGATE_URL: fallback — pede ao React para navegar diretamente por URL
 *  - CAPTURE_HTML: fallback — envia HTML bruto para parse regex
 *  - ERROR: erro inesperado
 */
export function buildCaptureScript(): string {
  return `
    (function() {
      try {
        function txt(el) { return el ? el.textContent.replace(/\\s+/g,' ').trim() : ''; }
        function num(s) {
          s = String(s).replace(/[^\\d.,]/g,'');
          if (!s) return 0;
          if (s.indexOf(',')!==-1) return parseFloat(s.replace(/\\./g,'').replace(',','.'))||0;
          return parseFloat(s)||0;
        }
        var items=[], total=0, emitterName='', emitterCnpj='', dateStr='', invoiceId='';

        // ── Estratégia 1: SEFAZ SP ConsultaResumida — tr[id^="Item"] ──
        var rows = document.querySelectorAll('tr[id^="Item"]');
        if (rows.length === 0) rows = document.querySelectorAll('#tabResult tr');

        Array.from(rows).forEach(function(tr) {
          var titSpan = tr.querySelector('span.txtTit');
          if (!titSpan) return;
          var desc = txt(titSpan);
          if (!desc || desc.length < 2) return;

          var qtdEl  = tr.querySelector('.Rqtd');
          var unitEl = tr.querySelector('.RUN');
          var vpuEl  = tr.querySelector('.RvlUnit');
          var vlrEl  = tr.querySelector('span.valor');

          var qtdRaw  = txt(qtdEl).replace(/Qtde?[.:]\\s*/i,'').trim();
          var unitRaw = txt(unitEl).replace(/UN[:\\s]*/i,'').replace(/\\s+/g,'') || 'UN';
          var vpuRaw  = txt(vpuEl).replace(/Vl\\.\\s*Unit\\.:\\s*/i,'').trim();

          var qtd  = qtdRaw  ? num(qtdRaw)  : 1;
          var unit = unitRaw || 'UN';
          var vpu  = vpuRaw  ? num(vpuRaw)  : 0;
          var vlr  = vlrEl   ? num(txt(vlrEl)) : 0;

          if (desc && vlr > 0) {
            items.push({description:desc, quantity:qtd||1, unit:unit, unitPrice:vpu, totalPrice:vlr});
          }
        });

        // ── Estratégia 2: ConsultaCompleta SEFAZ (fixo-prod-serv-*) ──
        if (items.length === 0) {
          var descCells = document.querySelectorAll('[class*="fixo-prod-serv-descricao"]');
          Array.from(descCells).forEach(function(descEl) {
            var tr = descEl.closest('tr');
            if (!tr) return;
            var desc = txt(descEl);
            if (!desc || desc.length < 2) return;
            var qtdEl = tr.querySelector('[class*="fixo-prod-serv-qtd"]');
            var ucEl  = tr.querySelector('[class*="fixo-prod-serv-uc"]');
            var vbEl  = tr.querySelector('[class*="fixo-prod-serv-vb"]');
            var qtd = qtdEl ? num(txt(qtdEl)) : 1;
            var uc  = ucEl  ? txt(ucEl).trim() || 'UN' : 'UN';
            var vlr = vbEl  ? num(txt(vbEl)) : 0;
            if (desc && (vlr > 0 || qtd > 0)) {
              items.push({description:desc, quantity:qtd||1, unit:uc, unitPrice:0, totalPrice:vlr});
            }
          });
        }

        // ── Estratégia 3: genérica (outros estados) ──
        if (items.length === 0) {
          document.querySelectorAll('tr').forEach(function(tr) {
            var dEl = tr.querySelector('[class*="descricao"],[class*="nome-prod"]');
            var vEl = tr.querySelector('[class*="valor"],[class*="preco"]');
            if (!dEl || !vEl) return;
            var desc = txt(dEl), vlr = num(txt(vEl));
            var qEl  = tr.querySelector('[class*="qtd"],[class*="quantidade"]');
            var qtd  = qEl ? num(txt(qEl)) : 1;
            if (desc && vlr > 0) {
              items.push({description:desc, quantity:qtd||1, unit:'UN', unitPrice:0, totalPrice:vlr});
            }
          });
        }

        // ── EAN/NCM de table.toggable (se já na ConsultaCompleta) ──
        var toggables = Array.from(document.querySelectorAll('table.toggable'));
        if (toggables.length === 0) toggables = Array.from(document.querySelectorAll('[class*="toggable"]'));
        toggables.forEach(function(tbl, idx) {
          if (idx >= items.length) return;
          var ean = '', ncm = '', productCode = '';
          Array.from(tbl.querySelectorAll('label')).forEach(function(lbl) {
            var t = txt(lbl).toLowerCase();
            var valEl = lbl.nextElementSibling;
            if (!valEl) {
              var ptd = lbl.parentElement;
              if (ptd) { var sp = ptd.querySelectorAll('span'); if (sp.length) valEl = sp[sp.length-1]; }
            }
            var val = valEl ? txt(valEl).replace(/\\s+/g,' ').trim() : '';
            if ((t.indexOf('ean') !== -1 || t.indexOf('gtin') !== -1) && /^\\d{8,14}$/.test(val.replace(/\\s/g,''))) {
              ean = val.replace(/\\s/g,'');
            } else if (t.indexOf('ncm') !== -1 && val) {
              ncm = val.replace(/\\s/g,'').substring(0,8);
            } else if (t.indexOf('código do produto') !== -1) {
              productCode = val;
            }
          });
          if (ean) items[idx].ean = ean;
          if (ncm) items[idx].ncm = ncm;
          if (productCode) items[idx].productCode = productCode;
        });

        // ── Total ──
        var maxEl = document.querySelector('.totalNumb.txtMax');
        if (maxEl) total = num(txt(maxEl));
        if (!total) {
          Array.from(document.querySelectorAll('div,li')).forEach(function(el) {
            if (/valor\\s*a\\s*pagar/i.test(txt(el))) {
              var sp = el.querySelector('.totalNumb, [class*="totalNumb"]');
              if (sp) { var v = num(txt(sp)); if (v > 0) total = v; }
            }
          });
        }
        if (!total && items.length > 0) {
          total = items.reduce(function(s,i){ return s + i.totalPrice; }, 0);
        }

        // ── Emitente ──
        var nEl = document.querySelector('#u20')
               || document.querySelector('.txtTopo')
               || document.querySelector('[id*="txtNome"],[class*="txtNome"],[class*="nomeEmit"]');
        emitterName = nEl ? txt(nEl) : '';
        var cM = document.body.innerHTML.match(/CNPJ[^:]*:\\s*([\\d]{2}\\.[\\d]{3}\\.[\\d]{3}\\/[\\d]{4}-[\\d]{2})/i);
        emitterCnpj = cM ? cM[1] : '';

        // ── Data ──
        var dM = document.body.textContent.match(/Emiss[aã]o[^\\d]{0,10}(\\d{2}\\/\\d{2}\\/\\d{4})/i)
              || document.body.textContent.match(/(\\d{2}\\/\\d{2}\\/\\d{4})/);
        dateStr = dM ? dM[1] : '';

        // ── Chave de acesso ──
        var chEl = document.querySelector('.chave, [class*="chave"]');
        if (chEl) invoiceId = txt(chEl).replace(/\\s/g,'');
        if (!invoiceId || invoiceId.length < 44) {
          var chM = document.body.textContent.match(/(\\d[\\d\\s]{42,}\\d)/);
          if (chM) invoiceId = chM[1].replace(/\\s/g,'').substring(0,44);
        }

        // ── Classes da página (debug) ──
        var classes = [];
        Array.from(document.querySelectorAll('[class]')).forEach(function(el) {
          if (typeof el.className !== 'string') return;
          el.className.split(/\\s+/).forEach(function(c){
            if (c && classes.indexOf(c) === -1) classes.push(c);
          });
        });

        if (items.length > 0) {
          // Detectar se já estamos na ConsultaCompleta (há table.toggable no DOM)
          var _sec0 = document.getElementById('Prod') || document.getElementById('prod') || document;
          var _tbls0 = Array.from(_sec0.querySelectorAll('table.toggable'));
          if (!_tbls0.length) _tbls0 = Array.from(_sec0.querySelectorAll('[class*="toggable"]'));

          if (_tbls0.length > 0) {
            // ConsultaCompleta: extrair EAN/NCM diretamente e encerrar
            _tbls0.forEach(function(tbl, idx) {
              if (idx >= items.length) return;
              Array.from(tbl.querySelectorAll('label')).forEach(function(lbl) {
                var t = txt(lbl).toLowerCase();
                var valEl = lbl.nextElementSibling;
                if (!valEl) { var ptd=lbl.parentElement; if(ptd){var sp=ptd.querySelectorAll('span');if(sp.length)valEl=sp[sp.length-1];} }
                if (!valEl) { var ptd2=lbl.closest('td,th,li,div'); if(ptd2&&ptd2.nextElementSibling){var sp2=ptd2.nextElementSibling.querySelectorAll('span');if(sp2.length)valEl=sp2[0];} }
                var val = valEl ? txt(valEl) : '';
                if ((t.indexOf('ean')!==-1||t.indexOf('gtin')!==-1)&&/^\\d{8,14}$/.test(val.replace(/\\s/g,''))) { items[idx].ean=val.replace(/\\s/g,''); }
                else if (t.indexOf('ncm')!==-1&&val) { items[idx].ncm=val.replace(/\\s/g,'').substring(0,8); }
                else if (t.indexOf('código do produto')!==-1) { items[idx].productCode=val; }
              });
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type:'CAPTURE_JSON', items:items, total:total, invoiceId:invoiceId,
              emitterName:emitterName, emitterCnpj:emitterCnpj, dateStr:dateStr
            }));
          } else {
            // ConsultaResumida: localizar e clicar botão "Visualizar em Abas"
            var _btn = document.getElementById('btnVisualizarAbas')
                     || document.getElementById('Conteudo_btnVisualizarAbas')
                     || document.querySelector('[name="btnVisualizarAbas"]')
                     || document.querySelector('input[value="Visualizar em Abas"]')
                     || document.querySelector('input[value*="Abas"]')
                     || document.querySelector('a[href*="VisualizarAbas"]')
                     || document.querySelector('[id*="btnVisualizar"]')
                     || document.querySelector('[id*="btnConsulta"][id*="Completa"]')
                     || (function(){
                          var _all=Array.from(document.querySelectorAll('input[type="button"],input[type="submit"],button,a'));
                          return _all.find(function(el){
                            var _v=(el.value||el.textContent||'').trim().toLowerCase();
                            return _v.indexOf('abas')!==-1||_v.indexOf('completa')!==-1||_v.indexOf('detalh')!==-1;
                          })||null;
                        })();

            if (_btn) {
              // Capturar dados Phase 1
              var _p1items = JSON.parse(JSON.stringify(items));
              var _p1 = {items:_p1items,total:total,invoiceId:invoiceId,
                         emitterName:emitterName,emitterCnpj:emitterCnpj,dateStr:dateStr};

              // Enviar Fase 1 para React — usuário vai clicar o botão diretamente no WebView.
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type:'PHASE1_NAVIGATING',
                items:_p1.items, total:_p1.total, invoiceId:_p1.invoiceId,
                emitterName:_p1.emitterName, emitterCnpj:_p1.emitterCnpj, dateStr:_p1.dateStr,
                _debug_btnId: _btn.name || _btn.id || ''
              }));

              // Ocultar toda a UI da SEFAZ via visibility:hidden e reposicionar apenas o
              // botão original com position:fixed centralizado. O botão permanece no
              // formulário original — ScriptManager e UpdatePanel funcionam normalmente.
              // NÃO usamos innerHTML='' para não destruir o JS do ScriptManager.
              try {
                if (!_btn.id) _btn.id = '_sfBtn';
                var _bid = _btn.id;
                _btn.value = 'Carregar detalhes dos produtos';
                var _msgDiv = document.createElement('div');
                _msgDiv.id = '_sfMsg';
                _msgDiv.textContent = 'Toque no bot\\u00e3o azul para carregar os detalhes dos produtos';
                document.body.appendChild(_msgDiv);
                var _st = document.createElement('style');
                _st.textContent = [
                  'html,body{margin:0!important;padding:0!important;background:#f0f4f8!important;}',
                  'body *{visibility:hidden!important;pointer-events:none!important;}',
                  '#' + _bid + '{visibility:visible!important;pointer-events:auto!important;',
                  'position:fixed!important;top:50%!important;left:50%!important;',
                  'transform:translate(-50%,-50%)!important;',
                  'width:calc(100vw - 48px)!important;max-width:380px!important;',
                  'padding:18px!important;font-size:18px!important;font-weight:bold!important;',
                  'background:#007AFF!important;color:#fff!important;border:none!important;',
                  'border-radius:12px!important;cursor:pointer!important;',
                  '-webkit-appearance:none!important;box-sizing:border-box!important;',
                  'z-index:2147483647!important;}',
                  '#_sfMsg{visibility:visible!important;pointer-events:none!important;',
                  'position:fixed!important;left:50%!important;',
                  'bottom:calc(50% + 36px)!important;',
                  'transform:translateX(-50%)!important;',
                  'width:calc(100vw - 48px)!important;max-width:380px!important;',
                  'font-size:15px!important;color:#555!important;text-align:center!important;',
                  'line-height:1.5!important;font-family:sans-serif!important;',
                  'z-index:2147483647!important;}',
                ].join('');
                document.head.appendChild(_st);
              } catch(eDom) { /* ignorar erros de DOM */ }
            } else {
              // Botão não encontrado — capturar com dados disponíveis (sem EAN/NCM)
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type:'CAPTURE_JSON', items:items, total:total, invoiceId:invoiceId,
                emitterName:emitterName, emitterCnpj:emitterCnpj, dateStr:dateStr,
                _debug_btnFound:false
              }));
            }
          }
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type:'CAPTURE_HTML', html:document.documentElement.outerHTML,
            debug:{
              rowsFound: rows.length,
              classes: classes.slice(0, 80),
              bodySnippet: document.body.textContent.substring(0, 400)
            }
          }));
        }
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'ERROR', message:String(e)}));
      }
    })();
    true;
  `;
}

/**
 * Script Fase 2: extrai EAN, NCM e código do produto de cada table.toggable
 * na página ConsultaCompleta do SEFAZ SP.
 *
 * Recebe os dados da Fase 1 serializados como JSON e enriquece os itens.
 * Faz polling por até 30 × 600ms = 18 segundos aguardando o DOM estar pronto.
 */
export function buildPhase2Script(p1json: string): string {
  return `
    (function() {
      function _t(el){return el?el.textContent.replace(/\\s+/g,' ').trim():'';}
      function _v(lbl){
        if(lbl.nextElementSibling) return _t(lbl.nextElementSibling);
        var p=lbl.parentElement;
        if(p){var sp=p.querySelectorAll('span');if(sp.length)return _t(sp[sp.length-1]);}
        var cell=lbl.closest('td,th,li,div,p');
        if(cell&&cell.nextElementSibling){
          var sp2=cell.nextElementSibling.querySelectorAll('span');
          if(sp2.length) return _t(sp2[0]);
          return _t(cell.nextElementSibling);
        }
        return '';
      }
      var _p1=${p1json};
      var _items=JSON.parse(JSON.stringify(_p1.items));
      var _MAX=30,_att=0;
      function _poll(){
        _att++;
        var _sec=document.getElementById('Prod')||document.getElementById('prod')||document;
        var _tbls=Array.from(_sec.querySelectorAll('table.toggable'));
        if(!_tbls.length)_tbls=Array.from(_sec.querySelectorAll('[class*="toggable"]'));
        if(_tbls.length>0||_att>=_MAX){
          _tbls.forEach(function(tbl,idx){
            if(idx>=_items.length)return;
            Array.from(tbl.querySelectorAll('label')).forEach(function(lbl){
              var t=_t(lbl).toLowerCase();
              var val=_v(lbl);
              if((t.indexOf('ean')!==-1||t.indexOf('gtin')!==-1)&&/^\\d{8,14}$/.test(val.replace(/\\s/g,''))){
                _items[idx].ean=val.replace(/\\s/g,'');
              }else if(t.indexOf('ncm')!==-1&&val){
                _items[idx].ncm=val.replace(/\\s/g,'').substring(0,8);
              }else if(t.indexOf('código do produto')!==-1){
                _items[idx].productCode=val;
              }
            });
          });
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type:'CAPTURE_JSON',items:_items,
            total:_p1.total,invoiceId:_p1.invoiceId,
            emitterName:_p1.emitterName,emitterCnpj:_p1.emitterCnpj,dateStr:_p1.dateStr,
            _debug_timeout:_att>=_MAX,_debug_pollAttempts:_att
          }));
        }else{setTimeout(_poll,600);}
      }
      setTimeout(_poll,800);
    })();
    true;
  `;
}
