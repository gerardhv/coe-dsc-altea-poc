(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ------------------------------------------------------------------
   * Mobile nav
   * ---------------------------------------------------------------- */
  const burger = $('#burger'), nav = $('#mainNav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });

  /* ------------------------------------------------------------------
   * Deep-dive terms: tooltip + expanding modal
   * ---------------------------------------------------------------- */
  const TOPICS = {
    'trust-mechanisms': {
      tip: 'Trust mechanisms are the legal, technical and organisational instruments — such as identity verification, access and usage policies, data sharing agreements and auditing — that make trust between data-sharing parties operational and verifiable.',
      modal: '#modal'
    }
  };
  const SOON_TEXT = 'A deep dive on this topic is not part of this demo yet.';

  const tip = $('#tip'), tipText = $('#tipText'), tipMore = $('#tipMore');
  const modal = $('#modal'), backdrop = $('#backdrop');
  let tipTerm = null, hideTimer = null, modalTerm = null;

  const termRect = el => {
    // first line box of the (possibly wrapped) inline term
    const r = el.getClientRects()[0] || el.getBoundingClientRect();
    return r;
  };

  function showTip(term) {
    clearTimeout(hideTimer);
    if (modal.classList.contains('open')) return;
    if (tipTerm && tipTerm !== term) tipTerm.classList.remove('is-open');
    tipTerm = term;
    const topic = TOPICS[term.dataset.topic];
    tip.classList.toggle('soon', !topic);
    tipText.textContent = topic ? topic.tip : SOON_TEXT;
    term.classList.add('is-open');
    tip.hidden = false;
    // position under the term, flip above if no room
    const r = termRect(term);
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, innerWidth - w - 12));
    let top = r.bottom + 8;
    if (top + h > innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
    tip.style.left = left + scrollX + 'px';
    tip.style.top = top + scrollY + 'px';
  }
  function hideTip(delay = 180) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      tip.hidden = true;
      if (tipTerm) tipTerm.classList.remove('is-open');
      tipTerm = null;
    }, delay);
  }

  $$('.deep').forEach(term => {
    term.addEventListener('mouseenter', () => showTip(term));
    term.addEventListener('mouseleave', () => hideTip());
    term.addEventListener('focus', () => showTip(term));
    term.addEventListener('blur', () => hideTip(250));
    term.addEventListener('click', e => { e.preventDefault(); showTip(term); }); // touch
    term.addEventListener('keydown', e => {
      if (e.key === 'Enter' && TOPICS[term.dataset.topic]) openModal(term);
    });
  });
  tip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  tip.addEventListener('mouseleave', () => hideTip());
  tipMore.addEventListener('click', () => { if (tipTerm) openModal(tipTerm); });
  document.addEventListener('click', e => {
    if (!tip.hidden && !tip.contains(e.target) && !e.target.closest('.deep')) hideTip(0);
  });

  function finalRect() {
    const w = Math.min(920, innerWidth * 0.94);
    const h = Math.min(innerHeight * 0.88, 900);
    return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
  }
  function setRect(el, r) {
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
  }

  function openModal(term) {
    modalTerm = term;
    // the highlight grows: start from the tooltip's box (or the term itself)
    const from = tip.hidden ? termRect(term) : tip.getBoundingClientRect();
    modal.hidden = false; backdrop.hidden = false;
    modal.classList.remove('open', 'ready');
    modal.style.transition = 'none';
    setRect(modal, from);
    modal.style.borderRadius = '12px';
    void modal.offsetWidth;                // commit start geometry
    modal.style.transition = '';
    tip.hidden = true;
    document.body.classList.add('lock');
    requestAnimationFrame(() => {
      modal.classList.add('open');
      backdrop.classList.add('show');
      setRect(modal, finalRect());
      setTimeout(() => modal.classList.add('ready'), 30);
      $('.modal-scroll', modal).scrollTop = 0;
      $('#modalClose').focus({ preventScroll: true });
    });
  }

  function closeModal() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('ready');
    backdrop.classList.remove('show');
    const back = modalTerm ? termRect(modalTerm) : finalRect();
    setRect(modal, back);
    setTimeout(() => {
      modal.hidden = true; backdrop.hidden = true;
      modal.classList.remove('open');
      document.body.classList.remove('lock');
      if (modalTerm) modalTerm.classList.remove('is-open');
      modalTerm && modalTerm.focus({ preventScroll: true });
    }, 480);
  }
  $('#modalClose').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  addEventListener('resize', () => { if (modal.classList.contains('ready')) setRect(modal, finalRect()); });

  /* ------------------------------------------------------------------
   * Chat bar
   * ---------------------------------------------------------------- */
  const form = $('#chatForm'), input = $('#chatInput'), sugg = $('#suggestions');
  const panel = $('#chatPanel'), msgUser = $('#msgUser');
  const thinking = $('#thinking'), answer = $('#answer');
  const REAL_Q = 'I want to start a dataspace, draft a short to-do list';
  let thinkTimer = null;

  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  const openSugg = () => { sugg.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const closeSugg = () => { sugg.hidden = true; input.setAttribute('aria-expanded', 'false'); };

  input.addEventListener('focus', openSugg);
  input.addEventListener('click', openSugg);
  input.addEventListener('input', () => { input.value.trim() ? closeSugg() : openSugg(); });
  document.addEventListener('click', e => { if (!form.contains(e.target)) closeSugg(); });

  sugg.addEventListener('mousedown', e => e.preventDefault()); // keep focus
  sugg.addEventListener('click', e => {
    const li = e.target.closest('li[data-q]');
    if (!li) return;
    input.value = li.dataset.q;
    ask(li.dataset.q);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) ask(q);
  });

  const ANSWER_HTML = `
    <p>Here's a short to-do list for starting your dataspace, based on the <strong>DSSC Blueprint V3 Summary</strong> (found in SharePoint › CoE-DSC - Published) and its Co-Creation Method:</p>
    <h4>To-do: Starting a dataspace</h4>
    <div>
      <div class="stage">Exploratory stage</div>
      <ul class="todo">
        ${todo(1, '<strong>Define the purpose and scope</strong> of the dataspace — why it exists, which data products, who benefits')}
        ${todo(2, '<strong>Identify key stakeholders and align them</strong> (you need a coalition of willing participants + an orchestrator to guide the process)')}
        ${todo(3, '<strong>Develop concrete use cases</strong> and identify the functional requirements they imply')}
      </ul>
      <div class="stage">Preparatory stage</div>
      <ul class="todo">
        ${todo(4, '<strong>Establish the organisational form</strong> and set up the governance authority')}
        ${todo(5, '<strong>Define roles:</strong> data providers, data consumers, service providers, governance authority')}
        ${todo(6, '<strong>Sketch the business model</strong> — how costs get covered and value is created')}
      </ul>
      <div class="stage">Implementation stage</div>
      <ul class="todo">
        ${todo(7, '<strong>Do the functional analysis and technical design</strong> (trust, identity, catalogue, policy enforcement)')}
        ${todo(8, '<strong>Draft the rulebook</strong> — the legal, business and technical rules participants must adhere to (contracts, participation agreements, trust framework)')}
        ${todo(9, '<strong>Build and implement</strong> — can run in parallel with steps 4–8 as long as the design processes stay leading')}
        ${todo(10, '<strong>Reuse standards:</strong> DCAT-AP for catalogues, ODRL for usage policies, W3C Verifiable Credentials, and the Eclipse Dataspace Protocol — don’t reinvent')}
        ${todo(11, '<strong>Launch operational processes:</strong> onboarding participants, publishing data products, matching use cases, handling data transactions')}
      </ul>
    </div>
    <div class="keep"><strong>Keep in mind (the Blueprint's five rules):</strong> every dataspace needs a rulebook and a governance authority to manage it; model data as products shared via catalogues; capture agreements in data-sharing contracts; and reuse DSSC standards to achieve economies of scale.</div>
    <p class="followup">Want me to turn this into a task list in Fibery, or expand any step (e.g. the rulebook or trust framework) using the other CoE-DSC documents in your workspace?</p>
    <div class="ai-meta"><span class="pill">Proof of concept</span>Scripted answer for demonstration purposes.</div>`;

  function todo(n, html) {
    return `<li><input type="checkbox" id="t${n}"><label for="t${n}">${html}</label></li>`;
  }

  function ask(q) {
    closeSugg();
    input.blur();
    clearTimeout(thinkTimer);
    msgUser.textContent = q;
    answer.hidden = true; answer.innerHTML = '';
    thinking.hidden = false;
    panel.hidden = false;
    panel.scrollTop = 0;

    thinkTimer = setTimeout(() => {
      thinking.hidden = true;
      if (norm(q) === norm(REAL_Q)) {
        answer.innerHTML = ANSWER_HTML;
      } else {
        answer.innerHTML = `<p>This proof of concept can only answer the first example question:</p>
          <p><strong>“${REAL_Q}”</strong></p>
          <p><a href="#" id="tryReal">Ask that question instead</a></p>
          <div class="ai-meta"><span class="pill">Proof of concept</span>In a live version, every question would be answered from the CoE-DSC knowledge base.</div>`;
        $('#tryReal').addEventListener('click', ev => { ev.preventDefault(); input.value = REAL_Q; ask(REAL_Q); });
      }
      answer.hidden = false;
    }, 2000);   // simulated 2-second "thinking" time
  }

  $('#chatClose').addEventListener('click', () => { panel.hidden = true; clearTimeout(thinkTimer); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('open')) closeModal();
    else if (!sugg.hidden) closeSugg();
    else if (!panel.hidden) { panel.hidden = true; clearTimeout(thinkTimer); }
    else hideTip(0);
  });
})();
